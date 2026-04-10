using System.Net.Http.Json;
using System.Text.Json;
using HearthHaven.API.Data;
using HearthHaven.API.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace HearthHaven.API.Controllers;

[Authorize(Roles = $"{AppRoles.Admin},{AppRoles.CaseManager},{AppRoles.DonationsManager},{AppRoles.OutreachManager}")]
[Route("[controller]")]
[ApiController]
public class MLPredictController : ControllerBase
{
    private readonly HearthHavenDbContext _db;
    private readonly IHttpClientFactory _httpFactory;

    public MLPredictController(HearthHavenDbContext db, IHttpClientFactory httpFactory)
    {
        _db = db;
        _httpFactory = httpFactory;
    }

    // ── Resident reintegration readiness ──────────────────────────────────────

    /// <summary>
    /// Score a resident's reintegration readiness.
    /// Assembles features from DB and proxies to the ML inference server.
    /// </summary>
    [HttpPost("reintegration/{residentId:int}")]
    public async Task<IActionResult> PredictReintegration(int residentId)
    {
        var resident = await _db.Residents.FindAsync(residentId);
        if (resident is null) return NotFound();

        var healthRecords = await _db.HealthWellbeingRecords
            .Where(h => h.ResidentId == residentId)
            .OrderBy(h => h.RecordDate)
            .ToListAsync();

        var eduRecords = await _db.EducationRecords
            .Where(e => e.ResidentId == residentId)
            .OrderBy(e => e.RecordDate)
            .ToListAsync();

        var sessions = await _db.ProcessRecordings
            .Where(p => p.ResidentId == residentId)
            .ToListAsync();

        var incidents = await _db.IncidentReports
            .Where(i => i.ResidentId == residentId)
            .ToListAsync();

        var visitations = await _db.HomeVisitations
            .Where(v => v.ResidentId == residentId)
            .ToListAsync();

        var interventions = await _db.InterventionPlans
            .Where(ip => ip.ResidentId == residentId)
            .ToListAsync();

        var features = BuildReintegrationFeatures(
            resident, healthRecords, eduRecords, sessions, incidents, visitations, interventions);

        return await ProxyToMl("predict/reintegration", new
        {
            resident_id = residentId,
            features,
        });
    }

    /// <summary>
    /// Build the 60-key feature dictionary the reintegration_achieved model expects.
    /// Pulled out so the batch top-candidates endpoint can call it once per resident
    /// without re-issuing per-resident DB queries — the caller is responsible for
    /// passing already-loaded related-table lists.
    /// </summary>
    private static Dictionary<string, object?> BuildReintegrationFeatures(
        Resident resident,
        IReadOnlyList<HealthWellbeingRecord> healthRecords,
        IReadOnlyList<EducationRecord> eduRecords,
        IReadOnlyList<ProcessRecording> sessions,
        IReadOnlyList<IncidentReport> incidents,
        IReadOnlyList<HomeVisitation> visitations,
        IReadOnlyList<InterventionPlan> interventions)
    {
        var today = DateTime.UtcNow.Date;
        var dob = resident.DateOfBirth.ToDateTime(TimeOnly.MinValue);
        var admission = resident.DateOfAdmission.ToDateTime(TimeOnly.MinValue);
        var closed = resident.DateClosed?.ToDateTime(TimeOnly.MinValue);

        var ageAtAdmissionDays = (int)(admission - dob).TotalDays;
        var daysInCare = (int)(today - admission).TotalDays;
        var lengthOfStayDays = closed.HasValue
            ? (int)(closed.Value - admission).TotalDays
            : daysInCare;

        // Health (latest record + completion rate)
        var latestHealth = healthRecords.LastOrDefault();
        double healthScoreLatest = (double?)latestHealth?.GeneralHealthScore ?? 0;
        double nutritionLatest   = (double?)latestHealth?.NutritionScore    ?? 0;
        double sleepLatest       = (double?)latestHealth?.SleepQualityScore ?? 0;
        double energyLatest      = (double?)latestHealth?.EnergyLevelScore  ?? 0;
        double? bmiLatest        = (double?)latestHealth?.Bmi;
        double checkupCompletion = healthRecords.Count > 0
            ? healthRecords.Count(h => h.MedicalCheckupDone) / (double)healthRecords.Count
            : 0;

        // Education (latest + averages)
        var latestEdu = eduRecords.LastOrDefault();
        double attendanceLatest  = (double?)latestEdu?.AttendanceRate  ?? 0;
        double progressLatest    = (double?)latestEdu?.ProgressPercent ?? 0;
        string eduLevelLatest    = latestEdu?.EducationLevel           ?? "None";
        string enrollmentLatest  = latestEdu?.EnrollmentStatus         ?? "Not Enrolled";
        string completionLatest  = latestEdu?.CompletionStatus         ?? "In Progress";
        double progressAvg       = eduRecords.Count > 0 ? eduRecords.Average(e => (double)e.ProgressPercent) : 0;
        double attendanceAvg     = eduRecords.Count > 0 ? eduRecords.Average(e => (double)e.AttendanceRate)  : 0;
        int educationRecordCount = eduRecords.Count;

        // Counseling
        int sessionCount          = sessions.Count;
        double avgSessionDuration = sessions.Count > 0 ? sessions.Average(p => (double)p.SessionDurationMinutes) : 0;
        double progressRate       = sessions.Count > 0 ? sessions.Count(p => p.ProgressNoted) / (double)sessions.Count : 0;
        double concernRate        = sessions.Count > 0 ? sessions.Count(p => p.ConcernsFlagged) / (double)sessions.Count : 0;
        double referralRate       = sessions.Count > 0 ? sessions.Count(p => p.ReferralMade) / (double)sessions.Count : 0;

        // Incidents
        static int SeverityNum(string s) => s switch { "High" => 3, "Medium" => 2, _ => 1 };
        int incidentCount     = incidents.Count;
        double avgSeverity    = incidents.Count > 0 ? incidents.Average(i => (double)SeverityNum(i.Severity)) : 0;
        int highSeverityCount = incidents.Count(i => SeverityNum(i.Severity) == 3);
        int runawayAttempts   = incidents.Count(i => i.IncidentType == "RunawayAttempt");
        int selfHarmIncidents = incidents.Count(i => i.IncidentType == "SelfHarm");

        // Visitations
        static int CoopNum(string? s) => s switch
        {
            "Highly Cooperative" => 4, "Cooperative" => 3, "Neutral" => 2, _ => 1
        };
        int visitationCount         = visitations.Count;
        double safetyConcernRate    = visitations.Count > 0 ? visitations.Count(v => v.SafetyConcernsNoted) / (double)visitations.Count : 0;
        double favorableOutcomeRate = visitations.Count > 0 ? visitations.Count(v => v.VisitOutcome == "Favorable") / (double)visitations.Count : 0;
        double familyCoopScore      = visitations.Count > 0 ? visitations.Average(v => (double)CoopNum(v.FamilyCooperationLevel)) : 0;

        // Interventions
        int totalPlans         = interventions.Count;
        int openPlans          = interventions.Count(ip => ip.Status == "Open");
        int planCategories     = interventions.Select(ip => ip.PlanCategory).Distinct().Count();
        double achievementRate = interventions.Count > 0 ? interventions.Count(ip => ip.Status == "Achieved") / (double)interventions.Count : 0;

        return new Dictionary<string, object?>
        {
            // Resident demographics & case info
            ["safehouse_id"]              = resident.SafehouseId,
            ["case_status"]               = resident.CaseStatus,
            ["case_category"]             = resident.CaseCategory,
            ["birth_status"]              = resident.BirthStatus,
            ["religion"]                  = resident.Religion ?? "Unknown",
            ["referral_source"]           = resident.ReferralSource,
            ["reintegration_type"]        = resident.ReintegrationType ?? "None",
            ["reintegration_status"]      = resident.ReintegrationStatus ?? "None",
            ["initial_risk_level"]        = resident.InitialRiskLevel,
            ["current_risk_level"]        = resident.CurrentRiskLevel,
            ["sub_cat_orphaned"]          = resident.SubCatOrphaned,
            ["sub_cat_trafficked"]        = resident.SubCatTrafficked,
            ["sub_cat_child_labor"]       = resident.SubCatChildLabor,
            ["sub_cat_physical_abuse"]    = resident.SubCatPhysicalAbuse,
            ["sub_cat_sexual_abuse"]      = resident.SubCatSexualAbuse,
            ["sub_cat_osaec"]             = resident.SubCatOsaec,
            ["sub_cat_cicl"]              = resident.SubCatCicl,
            ["sub_cat_at_risk"]           = resident.SubCatAtRisk,
            ["sub_cat_street_child"]      = resident.SubCatStreetChild,
            ["sub_cat_child_with_hiv"]    = resident.SubCatChildWithHiv,
            ["is_pwd"]                    = resident.IsPwd,
            ["pwd_type"]                  = resident.PwdType ?? "None",
            ["has_special_needs"]         = resident.HasSpecialNeeds,
            ["special_needs_diagnosis"]   = resident.SpecialNeedsDiagnosis ?? "None",
            ["family_is_4ps"]             = resident.FamilyIs4Ps,
            ["family_solo_parent"]        = resident.FamilySoloParent,
            ["family_indigenous"]         = resident.FamilyIndigenous,
            ["family_parent_pwd"]         = resident.FamilyParentPwd,
            ["family_informal_settler"]   = resident.FamilyInformalSettler,
            // Engineered date features
            ["age_at_admission_days"]     = ageAtAdmissionDays,
            ["days_in_care"]              = daysInCare,
            ["length_of_stay_days"]       = lengthOfStayDays,
            // Health aggregates
            ["health_score_latest"]       = healthScoreLatest,
            ["nutrition_score_latest"]    = nutritionLatest,
            ["sleep_score_latest"]        = sleepLatest,
            ["energy_score_latest"]       = energyLatest,
            ["bmi_latest"]                = (object?)bmiLatest ?? DBNull.Value,
            ["checkup_completion"]        = checkupCompletion,
            // Education aggregates
            ["attendance_rate_latest"]    = attendanceLatest,
            ["progress_percent_latest"]   = progressLatest,
            ["education_level_latest"]    = eduLevelLatest,
            ["enrollment_status_latest"]  = enrollmentLatest,
            ["completion_status_latest"]  = completionLatest,
            ["progress_avg"]              = progressAvg,
            ["attendance_avg"]            = attendanceAvg,
            ["education_records"]         = educationRecordCount,
            // Counseling aggregates
            ["session_count"]             = sessionCount,
            ["avg_session_duration"]      = avgSessionDuration,
            ["progress_rate"]             = progressRate,
            ["concern_rate"]              = concernRate,
            ["referral_rate"]             = referralRate,
            // Incident aggregates
            ["incident_count"]            = incidentCount,
            ["avg_severity"]              = avgSeverity,
            ["high_severity_count"]       = highSeverityCount,
            ["runaway_attempts"]          = runawayAttempts,
            ["self_harm_incidents"]       = selfHarmIncidents,
            // Visitation aggregates
            ["visitation_count"]          = visitationCount,
            ["safety_concern_rate"]       = safetyConcernRate,
            ["favorable_outcome_rate"]    = favorableOutcomeRate,
            ["family_cooperation_score"]  = familyCoopScore,
            // Intervention aggregates
            ["total_plans"]               = totalPlans,
            ["open_plans"]                = openPlans,
            ["plan_categories"]           = planCategories,
            ["plan_achievement_rate"]     = achievementRate,
        };
    }

    // ── Top reintegration candidates (batch) ──────────────────────────────────

    /// <summary>
    /// Score every active resident whose case is not already marked Completed,
    /// then return the top N ranked by readiness_score descending.
    ///
    /// This is a triage aid for admins, not a decision tool — see the model
    /// metrics in ml-pipelines/models/reintegration_achieved.pkl.metrics.json.
    /// </summary>
    [HttpPost("reintegration/top-candidates")]
    public async Task<IActionResult> GetTopReintegrationCandidates([FromQuery] int limit = 10)
    {
        if (limit <= 0) limit = 10;

        // 1. Eligible residents: active cases not already reintegrated.
        var residents = await _db.Residents
            .Where(r => r.CaseStatus == "Active"
                     && (r.ReintegrationStatus == null || r.ReintegrationStatus != "Completed"))
            .ToListAsync();

        if (residents.Count == 0)
        {
            return Ok(Array.Empty<object>());
        }

        var ids = residents.Select(r => r.ResidentId).ToList();

        // 2. Bulk-fetch related records once (WHERE IN(ids)) and group in memory,
        //    so feature assembly for N residents stays at 6 queries instead of 6N.
        var healthByResident = (await _db.HealthWellbeingRecords
                .Where(h => ids.Contains(h.ResidentId))
                .OrderBy(h => h.RecordDate)
                .ToListAsync())
            .GroupBy(h => h.ResidentId)
            .ToDictionary(g => g.Key, g => (IReadOnlyList<HealthWellbeingRecord>)g.ToList());

        var eduByResident = (await _db.EducationRecords
                .Where(e => ids.Contains(e.ResidentId))
                .OrderBy(e => e.RecordDate)
                .ToListAsync())
            .GroupBy(e => e.ResidentId)
            .ToDictionary(g => g.Key, g => (IReadOnlyList<EducationRecord>)g.ToList());

        var sessionsByResident = (await _db.ProcessRecordings
                .Where(p => ids.Contains(p.ResidentId))
                .ToListAsync())
            .GroupBy(p => p.ResidentId)
            .ToDictionary(g => g.Key, g => (IReadOnlyList<ProcessRecording>)g.ToList());

        var incidentsByResident = (await _db.IncidentReports
                .Where(i => ids.Contains(i.ResidentId))
                .ToListAsync())
            .GroupBy(i => i.ResidentId)
            .ToDictionary(g => g.Key, g => (IReadOnlyList<IncidentReport>)g.ToList());

        var visitationsByResident = (await _db.HomeVisitations
                .Where(v => ids.Contains(v.ResidentId))
                .ToListAsync())
            .GroupBy(v => v.ResidentId)
            .ToDictionary(g => g.Key, g => (IReadOnlyList<HomeVisitation>)g.ToList());

        var interventionsByResident = (await _db.InterventionPlans
                .Where(ip => ids.Contains(ip.ResidentId))
                .ToListAsync())
            .GroupBy(ip => ip.ResidentId)
            .ToDictionary(g => g.Key, g => (IReadOnlyList<InterventionPlan>)g.ToList());

        // Pre-fetch the safehouse names referenced by these residents so the
        // final projection doesn't need a per-row subquery.
        var safehouseIds = residents.Select(r => r.SafehouseId).Distinct().ToList();
        var safehouseNames = await _db.Safehouses
            .Where(s => safehouseIds.Contains(s.SafehouseId))
            .ToDictionaryAsync(s => s.SafehouseId, s => s.Name);

        // 3. Score each resident in parallel via the ML inference server.
        //    DbContext work is done — only HttpClient calls remain, and HttpClient
        //    is safe to use concurrently.
        var scoringTasks = residents.Select(async r =>
        {
            var features = BuildReintegrationFeatures(
                r,
                healthByResident.GetValueOrDefault(r.ResidentId)        ?? Array.Empty<HealthWellbeingRecord>(),
                eduByResident.GetValueOrDefault(r.ResidentId)           ?? Array.Empty<EducationRecord>(),
                sessionsByResident.GetValueOrDefault(r.ResidentId)      ?? Array.Empty<ProcessRecording>(),
                incidentsByResident.GetValueOrDefault(r.ResidentId)     ?? Array.Empty<IncidentReport>(),
                visitationsByResident.GetValueOrDefault(r.ResidentId)   ?? Array.Empty<HomeVisitation>(),
                interventionsByResident.GetValueOrDefault(r.ResidentId) ?? Array.Empty<InterventionPlan>());

            var (ok, body) = await ProxyToMlRaw("predict/reintegration", new
            {
                resident_id = r.ResidentId,
                features,
            });
            return (resident: r, ok, body);
        });

        var results = await Task.WhenAll(scoringTasks);

        // 4. Parse, sort by readiness_score desc, take top N, project to display shape.
        var ranked = results
            .Where(x => x.ok)
            .Select(x =>
            {
                var prediction = JsonSerializer.Deserialize<JsonElement>(x.body);
                var score = prediction.TryGetProperty("readiness_score", out var s) && s.ValueKind == JsonValueKind.Number
                    ? s.GetDouble()
                    : 0.0;
                return new
                {
                    residentId           = x.resident.ResidentId,
                    caseControlNo        = x.resident.CaseControlNo,
                    internalCode         = x.resident.InternalCode,
                    caseCategory         = x.resident.CaseCategory,
                    assignedSocialWorker = x.resident.AssignedSocialWorker,
                    safehouseName        = safehouseNames.GetValueOrDefault(x.resident.SafehouseId),
                    readinessScore       = score,
                    prediction,
                };
            })
            .OrderByDescending(x => x.readinessScore)
            .Take(limit)
            .ToList();

        return Ok(ranked);
    }

    // ── Resident education progress ───────────────────────────────────────────

    /// <summary>
    /// Predict a resident's education progress percent.
    /// Uses the same feature aggregation as reintegration, minus leaky columns.
    /// </summary>
    [HttpPost("progress/{residentId:int}")]
    public async Task<IActionResult> PredictProgress(int residentId)
    {
        var resident = await _db.Residents.FindAsync(residentId);
        if (resident is null) return NotFound();

        var today = DateTime.UtcNow.Date;
        var dob = resident.DateOfBirth.ToDateTime(TimeOnly.MinValue);
        var admission = resident.DateOfAdmission.ToDateTime(TimeOnly.MinValue);

        var ageAtAdmissionDays = (int)(admission - dob).TotalDays;
        var daysInCare = (int)(today - admission).TotalDays;

        var healthRecords = await _db.HealthWellbeingRecords
            .Where(h => h.ResidentId == residentId)
            .OrderBy(h => h.RecordDate)
            .ToListAsync();

        var latestHealth = healthRecords.LastOrDefault();
        double healthScoreLatest = (double?)latestHealth?.GeneralHealthScore ?? 0;
        double nutritionLatest   = (double?)latestHealth?.NutritionScore    ?? 0;
        double sleepLatest       = (double?)latestHealth?.SleepQualityScore ?? 0;
        double energyLatest      = (double?)latestHealth?.EnergyLevelScore  ?? 0;
        double? bmiLatest        = (double?)latestHealth?.Bmi;
        double checkupCompletion = healthRecords.Count > 0
            ? healthRecords.Count(h => h.MedicalCheckupDone) / (double)healthRecords.Count
            : 0;

        var eduRecords = await _db.EducationRecords
            .Where(e => e.ResidentId == residentId)
            .OrderBy(e => e.RecordDate)
            .ToListAsync();

        var latestEdu = eduRecords.LastOrDefault();
        double attendanceLatest  = (double?)latestEdu?.AttendanceRate  ?? 0;
        string eduLevelLatest    = latestEdu?.EducationLevel           ?? "None";
        string enrollmentLatest  = latestEdu?.EnrollmentStatus         ?? "Not Enrolled";
        string completionLatest  = latestEdu?.CompletionStatus         ?? "In Progress";
        double attendanceAvg     = eduRecords.Count > 0 ? eduRecords.Average(e => (double)e.AttendanceRate) : 0;
        int educationRecordCount = eduRecords.Count;

        var sessions = await _db.ProcessRecordings
            .Where(p => p.ResidentId == residentId)
            .ToListAsync();

        int sessionCount          = sessions.Count;
        double avgSessionDuration = sessions.Count > 0 ? sessions.Average(p => (double)p.SessionDurationMinutes) : 0;
        double progressRate       = sessions.Count > 0 ? sessions.Count(p => p.ProgressNoted)    / (double)sessions.Count : 0;
        double concernRate        = sessions.Count > 0 ? sessions.Count(p => p.ConcernsFlagged)  / (double)sessions.Count : 0;
        double referralRate       = sessions.Count > 0 ? sessions.Count(p => p.ReferralMade)     / (double)sessions.Count : 0;

        static int SeverityNum(string s) => s switch { "High" => 3, "Medium" => 2, _ => 1 };
        var incidents = await _db.IncidentReports
            .Where(i => i.ResidentId == residentId)
            .ToListAsync();

        int incidentCount     = incidents.Count;
        double avgSeverity    = incidents.Count > 0 ? incidents.Average(i => (double)SeverityNum(i.Severity)) : 0;
        int highSeverityCount = incidents.Count(i => SeverityNum(i.Severity) == 3);
        int runawayAttempts   = incidents.Count(i => i.IncidentType == "RunawayAttempt");
        int selfHarmIncidents = incidents.Count(i => i.IncidentType == "SelfHarm");

        static int CoopNum(string? s) => s switch
        {
            "Highly Cooperative" => 4, "Cooperative" => 3, "Neutral" => 2, _ => 1
        };
        var visitations = await _db.HomeVisitations
            .Where(v => v.ResidentId == residentId)
            .ToListAsync();

        int visitationCount         = visitations.Count;
        double safetyConcernRate    = visitations.Count > 0 ? visitations.Count(v => v.SafetyConcernsNoted)       / (double)visitations.Count : 0;
        double favorableOutcomeRate = visitations.Count > 0 ? visitations.Count(v => v.VisitOutcome == "Favorable") / (double)visitations.Count : 0;
        double familyCoopScore      = visitations.Count > 0 ? visitations.Average(v => (double)CoopNum(v.FamilyCooperationLevel)) : 0;

        var interventions = await _db.InterventionPlans
            .Where(ip => ip.ResidentId == residentId)
            .ToListAsync();

        int totalPlans         = interventions.Count;
        int openPlans          = interventions.Count(ip => ip.Status == "Open");
        int planCategories     = interventions.Select(ip => ip.PlanCategory).Distinct().Count();
        double achievementRate = interventions.Count > 0 ? interventions.Count(ip => ip.Status == "Achieved") / (double)interventions.Count : 0;

        // progress_percent_latest DROP list: progress_avg, length_of_stay_days,
        // reintegration_achieved, reintegration_status, current_risk_num,
        // current_risk_level, initial_risk_num, risk_improved, risk_escalated
        var features = new Dictionary<string, object?>
        {
            ["safehouse_id"]              = resident.SafehouseId,
            ["case_status"]               = resident.CaseStatus,
            ["case_category"]             = resident.CaseCategory,
            ["birth_status"]              = resident.BirthStatus,
            ["religion"]                  = resident.Religion ?? "Unknown",
            ["referral_source"]           = resident.ReferralSource,
            ["reintegration_type"]        = resident.ReintegrationType ?? "None",
            ["initial_risk_level"]        = resident.InitialRiskLevel,
            ["sub_cat_orphaned"]          = resident.SubCatOrphaned,
            ["sub_cat_trafficked"]        = resident.SubCatTrafficked,
            ["sub_cat_child_labor"]       = resident.SubCatChildLabor,
            ["sub_cat_physical_abuse"]    = resident.SubCatPhysicalAbuse,
            ["sub_cat_sexual_abuse"]      = resident.SubCatSexualAbuse,
            ["sub_cat_osaec"]             = resident.SubCatOsaec,
            ["sub_cat_cicl"]              = resident.SubCatCicl,
            ["sub_cat_at_risk"]           = resident.SubCatAtRisk,
            ["sub_cat_street_child"]      = resident.SubCatStreetChild,
            ["sub_cat_child_with_hiv"]    = resident.SubCatChildWithHiv,
            ["is_pwd"]                    = resident.IsPwd,
            ["pwd_type"]                  = resident.PwdType ?? "None",
            ["has_special_needs"]         = resident.HasSpecialNeeds,
            ["special_needs_diagnosis"]   = resident.SpecialNeedsDiagnosis ?? "None",
            ["family_is_4ps"]             = resident.FamilyIs4Ps,
            ["family_solo_parent"]        = resident.FamilySoloParent,
            ["family_indigenous"]         = resident.FamilyIndigenous,
            ["family_parent_pwd"]         = resident.FamilyParentPwd,
            ["family_informal_settler"]   = resident.FamilyInformalSettler,
            ["age_at_admission_days"]     = ageAtAdmissionDays,
            ["days_in_care"]              = daysInCare,
            ["health_score_latest"]       = healthScoreLatest,
            ["nutrition_score_latest"]    = nutritionLatest,
            ["sleep_score_latest"]        = sleepLatest,
            ["energy_score_latest"]       = energyLatest,
            ["bmi_latest"]                = (object?)bmiLatest ?? DBNull.Value,
            ["checkup_completion"]        = checkupCompletion,
            ["attendance_rate_latest"]    = attendanceLatest,
            ["education_level_latest"]    = eduLevelLatest,
            ["enrollment_status_latest"]  = enrollmentLatest,
            ["completion_status_latest"]  = completionLatest,
            ["attendance_avg"]            = attendanceAvg,
            ["education_records"]         = educationRecordCount,
            ["session_count"]             = sessionCount,
            ["avg_session_duration"]      = avgSessionDuration,
            ["progress_rate"]             = progressRate,
            ["concern_rate"]              = concernRate,
            ["referral_rate"]             = referralRate,
            ["incident_count"]            = incidentCount,
            ["avg_severity"]              = avgSeverity,
            ["high_severity_count"]       = highSeverityCount,
            ["runaway_attempts"]          = runawayAttempts,
            ["self_harm_incidents"]       = selfHarmIncidents,
            ["visitation_count"]          = visitationCount,
            ["safety_concern_rate"]       = safetyConcernRate,
            ["favorable_outcome_rate"]    = favorableOutcomeRate,
            ["family_cooperation_score"]  = familyCoopScore,
            ["total_plans"]               = totalPlans,
            ["open_plans"]                = openPlans,
            ["plan_categories"]           = planCategories,
            ["plan_achievement_rate"]     = achievementRate,
        };

        return await ProxyToMl("predict/progress", new
        {
            resident_id = residentId,
            features,
        });
    }

    // ── Social media post scores ───────────────────────────────────────────────

    /// <summary>
    /// Score a social media post for donation conversion probability and engagement rate.
    /// Returns both predictions in a single combined response.
    /// </summary>
    [HttpPost("social-post/{postId:int}")]
    public async Task<IActionResult> PredictSocialPost(int postId)
    {
        var post = await _db.SocialMediaPosts.FindAsync(postId);
        if (post is null) return NotFound();

        var postMonth = post.CreatedAt.Month;

        var features = new Dictionary<string, object?>
        {
            ["num_hashtags"]             = post.NumHashtags,
            ["mentions_count"]           = post.MentionsCount,
            ["caption_length"]           = post.CaptionLength,
            ["post_hour"]                = post.PostHour,
            ["post_month"]               = postMonth,
            ["follower_count_at_post"]   = post.FollowerCountAtPost,
            ["video_views"]              = post.VideoViews ?? 0,
            ["forwards"]                 = post.Forwards ?? 0,
            ["platform"]                 = post.Platform,
            ["post_type"]                = post.PostType,
            ["media_type"]               = post.MediaType,
            ["day_of_week"]              = post.DayOfWeek,
            ["call_to_action_type"]      = post.CallToActionType ?? "None",
            ["content_topic"]            = post.ContentTopic,
            ["sentiment_tone"]           = post.SentimentTone,
            ["campaign_name"]            = post.CampaignName ?? "None",
            ["has_call_to_action"]       = post.HasCallToAction,
            ["is_boosted"]               = post.IsBoosted,
            ["features_resident_story"]  = post.FeaturesResidentStory,
        };

        var conversionTask = ProxyToMlRaw("predict/donation-conversion", new
        {
            post_id = postId,
            features,
        });
        var engagementTask = ProxyToMlRaw("predict/engagement-rate", new
        {
            post_id = postId,
            features,
        });

        await Task.WhenAll(conversionTask, engagementTask);

        var (conversionOk, conversionBody) = await conversionTask;
        var (engagementOk, engagementBody) = await engagementTask;

        return Ok(new
        {
            donationConversion = conversionOk
                ? JsonSerializer.Deserialize<JsonElement>(conversionBody)
                : (object?)null,
            engagementRate = engagementOk
                ? JsonSerializer.Deserialize<JsonElement>(engagementBody)
                : (object?)null,
        });
    }

    // ── Donor lapse + upgrade predictions ─────────────────────────────────────

    /// <summary>
    /// Score a donor for lapse risk and upgrade potential.
    /// Returns both predictions in a single combined response.
    /// </summary>
    [HttpPost("donor/{supporterId:int}")]
    public async Task<IActionResult> PredictDonor(int supporterId)
    {
        var supporter = await _db.Supporters.FindAsync(supporterId);
        if (supporter is null) return NotFound();

        var donations = await _db.Donations
            .Where(d => d.SupporterId == supporterId)
            .ToListAsync();

        var baseFeatures = BuildDonorBaseFeatures(supporter, donations);

        var today = DateTime.UtcNow.Date;
        var lastDonationDate = donations.Count > 0
            ? donations.Max(d => d.DonationDate.ToDateTime(TimeOnly.MinValue))
            : (DateTime?)null;

        double daysSinceLastDonation = lastDonationDate.HasValue
            ? (today - lastDonationDate.Value.Date).TotalDays
            : -1;

        // Lapse model: exclude days_since_last_donation (direct leakage per training notebook)
        var lapseFeatures = new Dictionary<string, object?>(baseFeatures);

        // Upgrade model: include days_since_last_donation
        var upgradeFeatures = new Dictionary<string, object?>(baseFeatures)
        {
            ["days_since_last_donation"] = daysSinceLastDonation,
        };

        var lapseTask   = ProxyToMlRaw("predict/donor-lapse",   new { supporter_id = supporterId, features = lapseFeatures });
        var upgradeTask = ProxyToMlRaw("predict/donor-upgrade",  new { supporter_id = supporterId, features = upgradeFeatures });

        await Task.WhenAll(lapseTask, upgradeTask);

        var (lapseOk, lapseBody)     = await lapseTask;
        var (upgradeOk, upgradeBody) = await upgradeTask;

        return Ok(new
        {
            lapse = lapseOk
                ? JsonSerializer.Deserialize<JsonElement>(lapseBody)
                : (object?)null,
            upgrade = upgradeOk
                ? JsonSerializer.Deserialize<JsonElement>(upgradeBody)
                : (object?)null,
        });
    }

    /// <summary>
    /// Build the base donor feature dictionary shared by the lapse and upgrade
    /// models. The returned dict does NOT include <c>days_since_last_donation</c> —
    /// the upgrade model adds that on top, and the lapse model intentionally
    /// omits it to avoid direct leakage (see the donor-lapse training notebook).
    ///
    /// Pulled out so the batch top-candidates endpoints can call it once per
    /// supporter without re-issuing per-supporter DB queries — the caller is
    /// responsible for passing an already-loaded donations list.
    /// </summary>
    private static Dictionary<string, object?> BuildDonorBaseFeatures(
        Supporter supporter,
        IReadOnlyList<Donation> donations)
    {
        var today = DateTime.UtcNow.Date;

        var monetaryDonations = donations.Where(d => d.DonationType == "Monetary" && d.Amount.HasValue).ToList();
        int monetaryCount      = monetaryDonations.Count;
        double avgGift         = monetaryCount > 0 ? (double)monetaryDonations.Average(d => d.Amount!.Value) : 0;
        int uniqueCampaigns    = donations.Select(d => d.CampaignName).Distinct().Count();
        int donationTypesCount = donations.Select(d => d.DonationType).Distinct().Count();
        bool isRecurring       = donations.Any(d => d.IsRecurring);

        double daysSinceFirstDonation = supporter.FirstDonationDate.HasValue
            ? (today - supporter.FirstDonationDate.Value.ToDateTime(TimeOnly.MinValue).Date).TotalDays
            : -1;

        double daysSinceCreated = (today - supporter.CreatedAt.Date).TotalDays;

        return new Dictionary<string, object?>
        {
            ["monetary_donation_count"]  = monetaryCount,
            ["avg_monetary_gift"]        = avgGift,
            ["unique_campaigns"]         = uniqueCampaigns,
            ["donation_types_count"]     = donationTypesCount,
            ["days_since_first_donation"]= daysSinceFirstDonation,
            ["days_since_created"]       = daysSinceCreated,
            ["supporter_type"]           = supporter.SupporterType,
            ["relationship_type"]        = supporter.RelationshipType,
            ["country"]                  = supporter.Country ?? "Unknown",
            ["region"]                   = supporter.Region ?? "Unknown",
            ["status"]                   = supporter.Status,
            ["acquisition_channel"]      = supporter.AcquisitionChannel ?? "Unknown",
            ["is_recurring_donor"]       = isRecurring,
        };
    }

    // ── Top lapse-risk donors (batch) ─────────────────────────────────────────

    /// <summary>
    /// Score every active supporter with the donor-lapse model and return the
    /// top N ranked by lapse_score descending.
    ///
    /// Mirrors the reintegration batch endpoint's shape: one query for
    /// supporters, one query for all related donations, then parallel ML calls
    /// via Task.WhenAll. Skips supporters whose ML call fails so a single
    /// inference error doesn't blank the whole list.
    /// </summary>
    [HttpPost("donors/top-lapse-risk")]
    public async Task<IActionResult> GetTopLapseRiskDonors([FromQuery] int limit = 5)
    {
        if (limit <= 0) limit = 5;

        // 1. Eligible supporters: active status only.
        var supporters = await _db.Supporters
            .Where(s => s.Status == "Active")
            .ToListAsync();

        if (supporters.Count == 0)
        {
            return Ok(Array.Empty<object>());
        }

        var ids = supporters.Select(s => s.SupporterId).ToList();

        // 2. Bulk-fetch all donations for these supporters in ONE query and
        //    group by SupporterId so BuildDonorBaseFeatures becomes in-memory.
        var donationsBySupporter = (await _db.Donations
                .Where(d => ids.Contains(d.SupporterId))
                .ToListAsync())
            .GroupBy(d => d.SupporterId)
            .ToDictionary(g => g.Key, g => (IReadOnlyList<Donation>)g.ToList());

        // 3. Score each supporter in parallel — DbContext work is done, only
        //    HttpClient calls remain, and HttpClient is safe to use concurrently.
        var scoringTasks = supporters.Select(async s =>
        {
            var donations = donationsBySupporter.GetValueOrDefault(s.SupporterId)
                ?? Array.Empty<Donation>();

            // Lapse model: base features only (days_since_last_donation is a
            // direct-leakage feature excluded by the training notebook).
            var features = BuildDonorBaseFeatures(s, donations);

            var (ok, body) = await ProxyToMlRaw("predict/donor-lapse", new
            {
                supporter_id = s.SupporterId,
                features,
            });
            return (supporter: s, ok, body);
        });

        var results = await Task.WhenAll(scoringTasks);

        // 4. Parse, sort by lapse_score desc, take top N, project to display shape.
        var ranked = results
            .Where(x => x.ok)
            .Select(x =>
            {
                var prediction = JsonSerializer.Deserialize<JsonElement>(x.body);
                var score = prediction.TryGetProperty("lapse_score", out var s) && s.ValueKind == JsonValueKind.Number
                    ? s.GetDouble()
                    : 0.0;
                return new
                {
                    supporterId   = x.supporter.SupporterId,
                    displayName   = x.supporter.DisplayName,
                    supporterType = x.supporter.SupporterType,
                    country       = x.supporter.Country,
                    region        = x.supporter.Region,
                    status        = x.supporter.Status,
                    lapseScore    = score,
                    prediction,
                };
            })
            .OrderByDescending(x => x.lapseScore)
            .Take(limit)
            .ToList();

        return Ok(ranked);
    }

    // ── Top upgrade-potential donors (batch) ──────────────────────────────────

    /// <summary>
    /// Score every active supporter with the donor-upgrade model and return the
    /// top N ranked by upgrade_score descending. Same shape as the lapse-risk
    /// endpoint but the upgrade model includes days_since_last_donation, so we
    /// compute that per supporter from the bulk-fetched donations list.
    /// </summary>
    [HttpPost("donors/top-upgrade-potential")]
    public async Task<IActionResult> GetTopUpgradePotentialDonors([FromQuery] int limit = 5)
    {
        if (limit <= 0) limit = 5;

        var supporters = await _db.Supporters
            .Where(s => s.Status == "Active")
            .ToListAsync();

        if (supporters.Count == 0)
        {
            return Ok(Array.Empty<object>());
        }

        var ids = supporters.Select(s => s.SupporterId).ToList();

        var donationsBySupporter = (await _db.Donations
                .Where(d => ids.Contains(d.SupporterId))
                .ToListAsync())
            .GroupBy(d => d.SupporterId)
            .ToDictionary(g => g.Key, g => (IReadOnlyList<Donation>)g.ToList());

        var today = DateTime.UtcNow.Date;

        var scoringTasks = supporters.Select(async s =>
        {
            var donations = donationsBySupporter.GetValueOrDefault(s.SupporterId)
                ?? Array.Empty<Donation>();

            var baseFeatures = BuildDonorBaseFeatures(s, donations);

            // Upgrade model adds days_since_last_donation on top of the base dict.
            var lastDonationDate = donations.Count > 0
                ? donations.Max(d => d.DonationDate.ToDateTime(TimeOnly.MinValue))
                : (DateTime?)null;

            double daysSinceLastDonation = lastDonationDate.HasValue
                ? (today - lastDonationDate.Value.Date).TotalDays
                : -1;

            var features = new Dictionary<string, object?>(baseFeatures)
            {
                ["days_since_last_donation"] = daysSinceLastDonation,
            };

            var (ok, body) = await ProxyToMlRaw("predict/donor-upgrade", new
            {
                supporter_id = s.SupporterId,
                features,
            });
            return (supporter: s, ok, body);
        });

        var results = await Task.WhenAll(scoringTasks);

        var ranked = results
            .Where(x => x.ok)
            .Select(x =>
            {
                var prediction = JsonSerializer.Deserialize<JsonElement>(x.body);
                var score = prediction.TryGetProperty("upgrade_score", out var s) && s.ValueKind == JsonValueKind.Number
                    ? s.GetDouble()
                    : 0.0;
                return new
                {
                    supporterId   = x.supporter.SupporterId,
                    displayName   = x.supporter.DisplayName,
                    supporterType = x.supporter.SupporterType,
                    country       = x.supporter.Country,
                    region        = x.supporter.Region,
                    status        = x.supporter.Status,
                    upgradeScore  = score,
                    prediction,
                };
            })
            .OrderByDescending(x => x.upgradeScore)
            .Take(limit)
            .ToList();

        return Ok(ranked);
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private async Task<IActionResult> ProxyToMl(string path, object payload)
    {
        var (ok, body) = await ProxyToMlRaw(path, payload);
        if (!ok) return StatusCode(502, new { error = "ML service unavailable", detail = body });
        return Content(body, "application/json");
    }

    private async Task<(bool ok, string body)> ProxyToMlRaw(string path, object payload)
    {
        try
        {
            var client = _httpFactory.CreateClient("MLService");
            var response = await client.PostAsJsonAsync(path, payload);
            var body = await response.Content.ReadAsStringAsync();
            return (response.IsSuccessStatusCode, body);
        }
        catch (Exception ex)
        {
            return (false, ex.Message);
        }
    }
}
