using System.Net.Http.Json;
using System.Text.Json;
using HearthHaven.API.Data;
using HearthHaven.API.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Globalization;

namespace HearthHaven.API.Controllers;

[Authorize]
[Route("[controller]")]
[ApiController]
public class DashboardController : ControllerBase
{
    private readonly HearthHavenDbContext _db;
    private readonly IHttpClientFactory _httpFactory;
    private readonly IWebHostEnvironment _env;

    public DashboardController(HearthHavenDbContext db, IHttpClientFactory httpFactory, IWebHostEnvironment env)
    {
        _db = db;
        _httpFactory = httpFactory;
        _env = env;
    }

    // ── Payload ───────────────────────────────────────────────────────────────

    public sealed class AllocationPayload
    {
        public int DonationId { get; set; }
        public int SafehouseId { get; set; }
        public required string ProgramArea { get; set; }
        public decimal AmountAllocated { get; set; }
        public string? AllocationDate { get; set; }
        public string? Notes { get; set; }
    }

    // ── GET /Dashboard/TopStats ───────────────────────────────────────────────

    [HttpGet("TopStats")]
    public IActionResult GetTopStats()
    {
        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var monthStart    = new DateOnly(today.Year, today.Month, 1);
        var lastMonthStart = monthStart.AddMonths(-1);

        var activeResidents  = _db.Residents.Count(r => r.CaseStatus == "Active");
        var activeSafehouses = _db.Safehouses.Count(s => s.Status == "Active");

        var donationsThisMonth = _db.Donations
            .Where(d => d.DonationType == "Monetary" && d.Amount.HasValue && d.DonationDate >= monthStart)
            .Sum(d => (decimal?)d.Amount) ?? 0m;

        var thisMonthAvgHealth = _db.HealthWellbeingRecords
            .Where(h => h.GeneralHealthScore.HasValue && h.RecordDate >= monthStart)
            .Average(h => (double?)h.GeneralHealthScore) ?? 0.0;

        var lastMonthAvgHealth = _db.HealthWellbeingRecords
            .Where(h => h.GeneralHealthScore.HasValue
                        && h.RecordDate >= lastMonthStart
                        && h.RecordDate < monthStart)
            .Average(h => (double?)h.GeneralHealthScore) ?? 0.0;

        var healthTrend = "stable";
        if (thisMonthAvgHealth > lastMonthAvgHealth + 0.5)      healthTrend = "up";
        else if (thisMonthAvgHealth < lastMonthAvgHealth - 0.5) healthTrend = "down";

        return Ok(new
        {
            activeResidents,
            activeSafehouses,
            donationsThisMonth,
            healthTrend,
            healthTrendDetail = new
            {
                thisMonth = Math.Round(thisMonthAvgHealth, 1),
                lastMonth = Math.Round(lastMonthAvgHealth, 1),
            },
        });
    }

    // ── GET /Dashboard/CaseManager ────────────────────────────────────────────

    [HttpGet("CaseManager")]
    [Authorize(Roles = AppRoles.Admin + "," + AppRoles.CaseManager)]
    public IActionResult GetCaseManager()
    {
        var today            = DateOnly.FromDateTime(DateTime.UtcNow);
        var thirtyDaysAgo    = DateOnly.FromDateTime(DateTime.UtcNow.AddDays(-30));
        var fourteenDaysLater = DateOnly.FromDateTime(DateTime.UtcNow.AddDays(14));

        var highCriticalRiskCount = _db.Residents
            .Count(r => r.CaseStatus == "Active"
                        && (r.CurrentRiskLevel == "High" || r.CurrentRiskLevel == "Critical"));

        var unresolvedIncidents = _db.IncidentReports.Count(i => !i.Resolved);

        var flaggedCounselingSessions = _db.ProcessRecordings
            .Count(p => p.ConcernsFlagged && p.SessionDate >= thirtyDaysAgo);

        var upcomingCaseConferences = _db.InterventionPlans
            .Count(ip => ip.CaseConferenceDate != null
                         && ip.CaseConferenceDate >= today
                         && ip.CaseConferenceDate <= fourteenDaysLater
                         && ip.Status != "Closed"
                         && ip.Status != "Achieved");

        var pendingFollowUpVisits = _db.HomeVisitations.Count(v => v.FollowUpNeeded);

        // Escalated residents: current risk worse than initial — evaluated in memory
        var activeResidents = _db.Residents
            .Where(r => r.CaseStatus == "Active")
            .ToList();

        var escalatedResidents = activeResidents
            .Where(r => RiskRank(r.CurrentRiskLevel) > RiskRank(r.InitialRiskLevel))
            .OrderByDescending(r => RiskRank(r.CurrentRiskLevel))
            .Take(10)
            .Select(r => new
            {
                residentId           = r.ResidentId,
                caseControlNo        = r.CaseControlNo,
                internalCode         = r.InternalCode,
                caseCategory         = r.CaseCategory,
                currentRiskLevel     = r.CurrentRiskLevel,
                initialRiskLevel     = r.InitialRiskLevel,
                assignedSocialWorker = r.AssignedSocialWorker,
                safehouseId          = r.SafehouseId,
                dateOfAdmission      = r.DateOfAdmission.ToString("yyyy-MM-dd"),
            })
            .ToList();

        var reintegrationCandidates = _db.Residents
            .Where(r => r.CaseStatus == "Active" && r.ReintegrationStatus == "In Progress")
            .OrderBy(r => r.ResidentId)
            .Take(10)
            .Select(r => new
            {
                residentId           = r.ResidentId,
                caseControlNo        = r.CaseControlNo,
                internalCode         = r.InternalCode,
                caseCategory         = r.CaseCategory,
                currentRiskLevel     = r.CurrentRiskLevel,
                reintegrationType    = r.ReintegrationType,
                assignedSocialWorker = r.AssignedSocialWorker,
                safehouseId          = r.SafehouseId,
                dateOfAdmission      = r.DateOfAdmission.ToString("yyyy-MM-dd"),
            })
            .ToList();

        var safehouseOccupancy = _db.Safehouses
            .OrderBy(s => s.Name)
            .Select(s => new
            {
                safehouseId      = s.SafehouseId,
                name             = s.Name,
                status           = s.Status,
                currentOccupancy = s.CurrentOccupancy,
                capacityGirls    = s.CapacityGirls,
                occupancyPct     = s.CapacityGirls > 0
                    ? Math.Round((double)s.CurrentOccupancy / s.CapacityGirls * 100, 1)
                    : 0.0,
            })
            .ToList();

        var recentIncidents = _db.IncidentReports
            .Include(i => i.Resident)
            .OrderByDescending(i => i.IncidentDate)
            .ThenByDescending(i => i.IncidentId)
            .Take(10)
            .Select(i => new
            {
                incidentId       = i.IncidentId,
                residentId       = i.ResidentId,
                caseControlNo    = i.Resident != null ? i.Resident.CaseControlNo : "",
                safehouseId      = i.SafehouseId,
                incidentDate     = i.IncidentDate.ToString("yyyy-MM-dd"),
                incidentType     = i.IncidentType,
                severity         = i.Severity,
                resolved         = i.Resolved,
                followUpRequired = i.FollowUpRequired,
                reportedBy       = i.ReportedBy,
            })
            .ToList();

        return Ok(new
        {
            counts = new
            {
                highCriticalRisk       = highCriticalRiskCount,
                unresolvedIncidents,
                flaggedCounselingSessions,
                upcomingCaseConferences,
                pendingFollowUpVisits,
            },
            escalatedResidents,
            reintegrationCandidates,
            safehouseOccupancy,
            recentIncidents,
        });
    }

    // ── GET /Dashboard/CaseAnalytics ──────────────────────────────────────────

    [HttpGet("CaseAnalytics")]
    [Authorize(Roles = AppRoles.Admin + "," + AppRoles.CaseManager)]
    public IActionResult GetCaseAnalytics()
    {
        var cutoff = DateOnly.FromDateTime(DateTime.UtcNow.AddMonths(-12));

        var activeResidentIds = _db.Residents
            .Where(r => r.CaseStatus == "Active")
            .Select(r => r.ResidentId)
            .ToList();

        // Monthly education progress trend (last 12 months, active residents)
        var eduTrend = _db.EducationRecords
            .Where(e => activeResidentIds.Contains(e.ResidentId) && e.RecordDate >= cutoff)
            .GroupBy(e => new { e.RecordDate.Year, e.RecordDate.Month })
            .Select(g => new
            {
                period      = $"{g.Key.Year}-{g.Key.Month:D2}",
                label       = new DateTime(g.Key.Year, g.Key.Month, 1).ToString("MMM yyyy", CultureInfo.InvariantCulture),
                avgProgress = Math.Round(g.Average(e => (double)e.ProgressPercent), 1),
                count       = g.Count(),
            })
            .OrderBy(x => x.period)
            .ToList();

        // Monthly health score trend (last 12 months, active residents)
        var healthTrend = _db.HealthWellbeingRecords
            .Where(h => activeResidentIds.Contains(h.ResidentId)
                        && h.GeneralHealthScore.HasValue
                        && h.RecordDate >= cutoff)
            .GroupBy(h => new { h.RecordDate.Year, h.RecordDate.Month })
            .Select(g => new
            {
                period         = $"{g.Key.Year}-{g.Key.Month:D2}",
                label          = new DateTime(g.Key.Year, g.Key.Month, 1).ToString("MMM yyyy", CultureInfo.InvariantCulture),
                avgHealthScore = Math.Round(g.Average(h => (double)h.GeneralHealthScore!.Value), 1),
                count          = g.Count(),
            })
            .OrderBy(x => x.period)
            .ToList();

        // Current averages: latest record per active resident, computed in memory
        var latestEduRecords = _db.EducationRecords
            .Where(e => activeResidentIds.Contains(e.ResidentId))
            .OrderBy(e => e.RecordDate)
            .ToList()
            .GroupBy(e => e.ResidentId)
            .Select(g => g.Last())
            .ToList();

        var avgProgress  = latestEduRecords.Count > 0
            ? Math.Round(latestEduRecords.Average(e => (double)e.ProgressPercent), 1) : 0.0;
        var avgAttendance = latestEduRecords.Count > 0
            ? Math.Round(latestEduRecords.Average(e => (double)e.AttendanceRate), 1) : 0.0;

        var latestHealthRecords = _db.HealthWellbeingRecords
            .Where(h => activeResidentIds.Contains(h.ResidentId) && h.GeneralHealthScore.HasValue)
            .OrderBy(h => h.RecordDate)
            .ToList()
            .GroupBy(h => h.ResidentId)
            .Select(g => g.Last())
            .ToList();

        var avgHealthScore = latestHealthRecords.Count > 0
            ? Math.Round(latestHealthRecords.Average(h => (double)h.GeneralHealthScore!.Value), 1) : 0.0;

        // Causal driver CSVs
        var riskDrivers              = ReadCsvDrivers("current_risk_num_drivers.csv");
        var interventionEffectiveness = ReadCsvDrivers("intervention_effectiveness_coefficients.csv");

        return Ok(new
        {
            riskDrivers,
            interventionEffectiveness,
            monthlyTrends = new
            {
                education = eduTrend,
                health    = healthTrend,
            },
            currentAverages = new
            {
                avgProgressPercent  = avgProgress,
                avgAttendanceRate   = avgAttendance,
                avgHealthScore,
                activeResidentCount = activeResidentIds.Count,
            },
        });
    }

    // ── GET /Dashboard/DonorManager ───────────────────────────────────────────

    [HttpGet("DonorManager")]
    [Authorize(Roles = AppRoles.Admin + "," + AppRoles.DonationsManager)]
    public async Task<IActionResult> GetDonorManager()
    {
        var today           = DateOnly.FromDateTime(DateTime.UtcNow);
        var thirtyDaysAgo   = DateOnly.FromDateTime(DateTime.UtcNow.AddDays(-30));
        var twelveMonthsAgo = DateOnly.FromDateTime(DateTime.UtcNow.AddMonths(-12));

        // Stats
        var donationCountLast30 = _db.Donations.Count(d => d.DonationDate >= thirtyDaysAgo);
        var totalAmountLast30   = _db.Donations
            .Where(d => d.DonationType == "Monetary" && d.Amount.HasValue && d.DonationDate >= thirtyDaysAgo)
            .Sum(d => (decimal?)d.Amount) ?? 0m;

        var activeMonetaryDonorCount = _db.Donations
            .Where(d => d.DonationType == "Monetary")
            .Join(_db.Supporters.Where(s => s.Status == "Active"),
                d => d.SupporterId, s => s.SupporterId,
                (d, s) => d.SupporterId)
            .Distinct()
            .Count();

        // Donation trend (last 12 months, monetary)
        var donationTrend = _db.Donations
            .Where(d => d.DonationType == "Monetary" && d.Amount.HasValue && d.DonationDate >= twelveMonthsAgo)
            .GroupBy(d => new { d.DonationDate.Year, d.DonationDate.Month })
            .Select(g => new
            {
                period        = $"{g.Key.Year}-{g.Key.Month:D2}",
                label         = new DateTime(g.Key.Year, g.Key.Month, 1).ToString("MMM yyyy", CultureInfo.InvariantCulture),
                totalAmount   = g.Sum(d => d.Amount),
                donationCount = g.Count(),
            })
            .OrderBy(x => x.period)
            .ToList();

        // Recent monetary donations
        var recentDonations = _db.Donations
            .Include(d => d.Supporter)
            .Where(d => d.DonationType == "Monetary")
            .OrderByDescending(d => d.DonationDate)
            .ThenByDescending(d => d.DonationId)
            .Take(10)
            .Select(d => new
            {
                donationId    = d.DonationId,
                supporterName = d.Supporter != null ? d.Supporter.DisplayName : "Unknown",
                amount        = d.Amount,
                currencyCode  = d.CurrencyCode ?? "USD",
                donationDate  = d.DonationDate.ToString("yyyy-MM-dd"),
                channelSource = d.ChannelSource,
                isRecurring   = d.IsRecurring,
            })
            .ToList();

        // Non-monetary support (Volunteer, In-Kind, Skills, etc.)
        var nonMonetaryRaw = _db.Donations
            .Include(d => d.Supporter)
            .Where(d => d.DonationType != "Monetary")
            .OrderByDescending(d => d.DonationDate)
            .Take(50)
            .ToList();

        var nonMonetarySupport = nonMonetaryRaw
            .GroupBy(d => d.SupporterId)
            .Select(g =>
            {
                var latest = g.OrderByDescending(d => d.DonationDate).First();
                return new
                {
                    supporterId          = g.Key,
                    displayName          = latest.Supporter?.DisplayName ?? "Unknown",
                    supporterType        = latest.Supporter?.SupporterType ?? "",
                    lastContributionDate = latest.DonationDate.ToString("yyyy-MM-dd"),
                    donationType         = latest.DonationType,
                };
            })
            .Take(10)
            .ToList();

        // ML scoring: score recurring or high-value active donors for lapse + upgrade risk
        const decimal HighValueThreshold = 10_000m;

        var targetIds = await _db.Donations
            .Where(d => d.IsRecurring
                        || (d.DonationType == "Monetary" && d.Amount.HasValue && d.Amount >= HighValueThreshold))
            .Select(d => d.SupporterId)
            .Distinct()
            .ToListAsync();

        var targetSupporters = await _db.Supporters
            .Where(s => s.Status == "Active" && targetIds.Contains(s.SupporterId))
            .ToListAsync();

        var donationsBySupporter = (await _db.Donations
                .Where(d => targetIds.Contains(d.SupporterId))
                .ToListAsync())
            .GroupBy(d => d.SupporterId)
            .ToDictionary(g => g.Key, g => (IReadOnlyList<Donation>)g.ToList());

        var todayDt = DateTime.UtcNow.Date;

        var scoringTasks = targetSupporters.Select(async s =>
        {
            var donations    = donationsBySupporter.GetValueOrDefault(s.SupporterId) ?? Array.Empty<Donation>();
            var baseFeatures = BuildDonorBaseFeatures(s, donations);

            var lastDonationDate = donations.Count > 0
                ? donations.Max(d => d.DonationDate.ToDateTime(TimeOnly.MinValue))
                : (DateTime?)null;
            double daysSinceLast = lastDonationDate.HasValue
                ? (todayDt - lastDonationDate.Value.Date).TotalDays : -1;

            var upgradeFeatures = new Dictionary<string, object?>(baseFeatures)
            {
                ["days_since_last_donation"] = daysSinceLast,
            };

            var lapseTask   = ProxyToMlRaw("predict/donor-lapse",   new { supporter_id = s.SupporterId, features = baseFeatures });
            var upgradeTask = ProxyToMlRaw("predict/donor-upgrade",  new { supporter_id = s.SupporterId, features = upgradeFeatures });

            await Task.WhenAll(lapseTask, upgradeTask);

            return (
                supporter: s,
                lapseOk:   lapseTask.Result.ok,   lapseBody:   lapseTask.Result.body,
                upgradeOk: upgradeTask.Result.ok, upgradeBody: upgradeTask.Result.body
            );
        });

        var scoringResults = await Task.WhenAll(scoringTasks);

        var atRiskDonors = scoringResults
            .Where(x => x.lapseOk)
            .Select(x =>
            {
                var p = JsonSerializer.Deserialize<JsonElement>(x.lapseBody);
                var score = p.TryGetProperty("lapse_score", out var s) && s.ValueKind == JsonValueKind.Number
                    ? s.GetDouble() : 0.0;
                var rec = p.TryGetProperty("recommendation", out var r) ? r.GetString() : null;
                return new
                {
                    supporterId   = x.supporter.SupporterId,
                    displayName   = x.supporter.DisplayName,
                    email         = x.supporter.Email,
                    phone         = x.supporter.Phone,
                    supporterType = x.supporter.SupporterType,
                    lapseScore    = score,
                    recommendation = rec,
                };
            })
            .OrderByDescending(x => x.lapseScore)
            .Take(10)
            .ToList();

        var upgradeCandidates = scoringResults
            .Where(x => x.upgradeOk)
            .Select(x =>
            {
                var p = JsonSerializer.Deserialize<JsonElement>(x.upgradeBody);
                var score = p.TryGetProperty("upgrade_score", out var s) && s.ValueKind == JsonValueKind.Number
                    ? s.GetDouble() : 0.0;
                var rec = p.TryGetProperty("recommendation", out var r) ? r.GetString() : null;
                return new
                {
                    supporterId    = x.supporter.SupporterId,
                    displayName    = x.supporter.DisplayName,
                    email          = x.supporter.Email,
                    phone          = x.supporter.Phone,
                    supporterType  = x.supporter.SupporterType,
                    upgradeScore   = score,
                    recommendation = rec,
                };
            })
            .OrderByDescending(x => x.upgradeScore)
            .Take(10)
            .ToList();

        return Ok(new
        {
            stats = new
            {
                donationCountLast30Days  = donationCountLast30,
                totalAmountLast30Days    = totalAmountLast30,
                activeMonetaryDonorCount,
            },
            atRiskDonors,
            upgradeCandidates,
            donationTrend,
            recentDonations,
            nonMonetarySupport,
        });
    }

    // ── GET /Dashboard/DonorAllocations ───────────────────────────────────────

    [HttpGet("DonorAllocations")]
    [Authorize(Roles = AppRoles.Admin + "," + AppRoles.DonationsManager)]
    public IActionResult GetDonorAllocations()
    {
        var totalMonetary = _db.Donations
            .Where(d => d.DonationType == "Monetary" && d.Amount.HasValue)
            .Sum(d => (decimal?)d.Amount) ?? 0m;

        var totalAllocated = _db.DonationAllocations
            .Sum(a => (decimal?)a.AmountAllocated) ?? 0m;

        var byProgramArea = _db.DonationAllocations
            .GroupBy(a => a.ProgramArea)
            .Select(g => new
            {
                programArea     = g.Key,
                totalAllocated  = g.Sum(a => a.AmountAllocated),
                allocationCount = g.Count(),
            })
            .OrderByDescending(x => x.totalAllocated)
            .ToList();

        var bySafehouse = _db.DonationAllocations
            .Join(_db.Safehouses,
                a => a.SafehouseId, s => s.SafehouseId,
                (a, s) => new { a, s })
            .GroupBy(x => new { x.s.SafehouseId, x.s.Name })
            .Select(g => new
            {
                safehouseId     = g.Key.SafehouseId,
                safehouseName   = g.Key.Name,
                totalAllocated  = g.Sum(x => x.a.AmountAllocated),
                allocationCount = g.Count(),
            })
            .OrderByDescending(x => x.totalAllocated)
            .ToList();

        var recentAllocations = _db.DonationAllocations
            .Join(_db.Donations,
                a => a.DonationId, d => d.DonationId,
                (a, d) => new { a, d })
            .Join(_db.Safehouses,
                x => x.a.SafehouseId, s => s.SafehouseId,
                (x, s) => new { x.a, x.d, s })
            .OrderByDescending(x => x.a.AllocationDate)
            .ThenByDescending(x => x.a.AllocationId)
            .Take(10)
            .Select(x => new
            {
                allocationId    = x.a.AllocationId,
                donationId      = x.a.DonationId,
                donationType    = x.d.DonationType,
                safehouseName   = x.s.Name,
                programArea     = x.a.ProgramArea,
                amountAllocated = x.a.AmountAllocated,
                allocationDate  = x.a.AllocationDate.ToString("yyyy-MM-dd"),
                notes           = x.a.AllocationNotes,
            })
            .ToList();

        return Ok(new
        {
            totals = new
            {
                totalMonetary,
                totalAllocated,
                unallocated = totalMonetary - totalAllocated,
            },
            byProgramArea,
            bySafehouse,
            recentAllocations,
        });
    }

    // ── POST /Dashboard/DonorAllocations ──────────────────────────────────────

    [HttpPost("DonorAllocations")]
    [Authorize(Roles = AppRoles.Admin + "," + AppRoles.DonationsManager)]
    public async Task<IActionResult> CreateAllocation([FromBody] AllocationPayload payload)
    {
        if (string.IsNullOrWhiteSpace(payload.ProgramArea))
            return BadRequest("Program area is required.");

        if (payload.AmountAllocated <= 0)
            return BadRequest("Amount allocated must be greater than zero.");

        var donation = await _db.Donations.FindAsync(payload.DonationId);
        if (donation == null)
            return NotFound($"Donation {payload.DonationId} not found.");

        var donationTotal    = donation.Amount ?? donation.EstimatedValue ?? 0m;
        var alreadyAllocated = _db.DonationAllocations
            .Where(a => a.DonationId == payload.DonationId)
            .Sum(a => (decimal?)a.AmountAllocated) ?? 0m;
        var remaining = donationTotal - alreadyAllocated;

        if (payload.AmountAllocated > remaining)
            return BadRequest($"Amount exceeds available balance. Donation total: {donationTotal:F2}, already allocated: {alreadyAllocated:F2}, remaining: {remaining:F2}.");

        var allocationDate = DateOnly.FromDateTime(DateTime.UtcNow);
        if (!string.IsNullOrWhiteSpace(payload.AllocationDate)
            && DateOnly.TryParse(payload.AllocationDate, out var parsedDate))
            allocationDate = parsedDate;

        var allocation = new DonationAllocation
        {
            DonationId      = payload.DonationId,
            SafehouseId     = payload.SafehouseId,
            ProgramArea     = payload.ProgramArea,
            AmountAllocated = payload.AmountAllocated,
            AllocationDate  = allocationDate,
            AllocationNotes = payload.Notes,
        };

        try
        {
            _db.DonationAllocations.Add(allocation);
            await _db.SaveChangesAsync();
            return Ok(new { allocationId = allocation.AllocationId });
        }
        catch (Exception ex)
        {
            return StatusCode(500, ex.InnerException?.Message ?? ex.Message);
        }
    }

    // ── GET /Dashboard/SocialMediaManager ─────────────────────────────────────

    [HttpGet("SocialMediaManager")]
    [Authorize(Roles = AppRoles.Admin + "," + AppRoles.OutreachManager)]
    public async Task<IActionResult> GetSocialMediaManager()
    {
        var now             = DateTime.UtcNow;
        var monthStart      = new DateTime(now.Year, now.Month, 1, 0, 0, 0, DateTimeKind.Utc);
        var twelveMonthsAgo = now.AddMonths(-12);

        // Posts where metrics haven't been entered (engagement rate is still 0)
        var postsNeedingMetrics = _db.SocialMediaPosts
            .Where(p => p.EngagementRate == 0)
            .OrderByDescending(p => p.CreatedAt)
            .Select(p => new
            {
                postId       = p.PostId,
                platform     = p.Platform,
                postType     = p.PostType,
                contentTopic = p.ContentTopic,
                createdAt    = p.CreatedAt,
                caption      = p.Caption,
            })
            .ToList();

        // Monthly engagement rate trend (last 12 months)
        var engagementTrend = _db.SocialMediaPosts
            .Where(p => p.CreatedAt >= twelveMonthsAgo)
            .GroupBy(p => new { p.CreatedAt.Year, p.CreatedAt.Month })
            .Select(g => new
            {
                period               = $"{g.Key.Year}-{g.Key.Month:D2}",
                label                = new DateTime(g.Key.Year, g.Key.Month, 1).ToString("MMM yyyy", CultureInfo.InvariantCulture),
                avgEngagementRate    = Math.Round(g.Average(p => (double)p.EngagementRate), 4),
                avgEngagementRatePct = Math.Round(g.Average(p => (double)p.EngagementRate) * 100, 2),
                postCount            = g.Count(),
            })
            .OrderBy(x => x.period)
            .ToList();

        // Monthly donation referral trend (last 12 months)
        var donationReferralTrend = _db.SocialMediaPosts
            .Where(p => p.CreatedAt >= twelveMonthsAgo)
            .GroupBy(p => new { p.CreatedAt.Year, p.CreatedAt.Month })
            .Select(g => new
            {
                period         = $"{g.Key.Year}-{g.Key.Month:D2}",
                label          = new DateTime(g.Key.Year, g.Key.Month, 1).ToString("MMM yyyy", CultureInfo.InvariantCulture),
                totalReferrals = g.Sum(p => p.DonationReferrals),
                postCount      = g.Count(),
            })
            .OrderBy(x => x.period)
            .ToList();

        // Top 5 posts by engagement rate
        var topPosts = _db.SocialMediaPosts
            .OrderByDescending(p => p.EngagementRate)
            .Take(5)
            .Select(p => new
            {
                postId            = p.PostId,
                platform          = p.Platform,
                postType          = p.PostType,
                contentTopic      = p.ContentTopic,
                engagementRate    = p.EngagementRate,
                engagementRatePct = Math.Round((double)p.EngagementRate * 100, 2),
                donationReferrals = p.DonationReferrals,
                createdAt         = p.CreatedAt,
            })
            .ToList();

        // Posting strategy drivers from CSV
        var postingDrivers = ReadCsvDrivers("posting_strategy_coefficients.csv");

        // Monthly donation forecast using current month's posts
        var currentMonthPosts = await _db.SocialMediaPosts
            .Where(p => p.CreatedAt >= monthStart && p.CreatedAt < monthStart.AddMonths(1))
            .ToListAsync();

        object? monthlyForecast = null;
        if (currentMonthPosts.Count > 0)
            monthlyForecast = await BuildMonthlyForecast(currentMonthPosts, now.ToString("yyyy-MM"));

        return Ok(new
        {
            postsNeedingMetrics,
            engagementTrend,
            donationReferralTrend,
            topPosts,
            postingDrivers,
            monthlyForecast,
        });
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private static int RiskRank(string? level) => level switch
    {
        "Low"      => 1,
        "Medium"   => 2,
        "High"     => 3,
        "Critical" => 4,
        _          => 0,
    };

    /// <summary>
    /// Read the first <paramref name="topN"/> data rows of a CSV from the ml-pipelines/models directory.
    /// Returns an empty list (never throws) when the file is absent or unreadable.
    /// </summary>
    private List<Dictionary<string, string>> ReadCsvDrivers(string filename, int topN = 5)
    {
        try
        {
            var repoRoot = Path.GetFullPath(Path.Combine(_env.ContentRootPath, "..", ".."));
            var filePath = Path.Combine(repoRoot, "ml-pipelines", "models", filename);

            if (!System.IO.File.Exists(filePath))
                return [];

            var lines = System.IO.File.ReadAllLines(filePath);
            if (lines.Length < 2)
                return [];

            var headers = lines[0].Split(',').Select(h => h.Trim('"').Trim()).ToArray();
            var result  = new List<Dictionary<string, string>>();

            foreach (var line in lines.Skip(1).Take(topN))
            {
                if (string.IsNullOrWhiteSpace(line)) continue;
                var values = line.Split(',').Select(v => v.Trim('"').Trim()).ToArray();
                var row    = new Dictionary<string, string>();
                for (int i = 0; i < headers.Length && i < values.Length; i++)
                    row[headers[i]] = values[i];
                result.Add(row);
            }
            return result;
        }
        catch
        {
            return [];
        }
    }

    /// <summary>
    /// Assemble the monthly donation feature vector from a list of posts and call the FastAPI
    /// monthly-donations forecast endpoint. Returns null when the ML service is unavailable.
    /// Feature columns match models/monthly_donation_features.json.
    /// </summary>
    private async Task<object?> BuildMonthlyForecast(List<SocialMediaPost> posts, string month)
    {
        int    n                = posts.Count;
        double totalImpressions = posts.Sum(p => (double)p.Impressions);
        double totalReach       = posts.Sum(p => (double)p.Reach);
        double totalLikes       = posts.Sum(p => (double)p.Likes);
        double totalEngagement  = posts.Average(p => (double)p.EngagementRate);
        int    boostedPosts     = posts.Count(p => p.IsBoosted);
        double avgCaptionLength = posts.Average(p => (double)p.CaptionLength);
        int    postsWithCta     = posts.Count(p => p.HasCallToAction);
        int    postsWithStory   = posts.Count(p => p.FeaturesResidentStory);
        double totalVideoViews  = posts.Sum(p => (double)(p.VideoViews ?? 0));

        // Platform proportions
        double Prop(Func<SocialMediaPost, bool> pred) => posts.Count(pred) / (double)n;

        var features = new Dictionary<string, object>
        {
            ["total_posts"]        = n,
            ["total_impressions"]  = totalImpressions,
            ["total_reach"]        = totalReach,
            ["total_likes"]        = totalLikes,
            ["total_engagement"]   = totalEngagement,
            ["boosted_posts"]      = boostedPosts,
            ["avg_caption_length"] = avgCaptionLength,
            ["posts_with_cta"]     = postsWithCta,
            ["posts_with_story"]   = postsWithStory,
            ["total_video_views"]  = totalVideoViews,
            // Platform proportions
            ["platform_Facebook"]  = Prop(p => p.Platform == "Facebook"),
            ["platform_Instagram"] = Prop(p => p.Platform == "Instagram"),
            ["platform_LinkedIn"]  = Prop(p => p.Platform == "LinkedIn"),
            ["platform_TikTok"]    = Prop(p => p.Platform == "TikTok"),
            ["platform_Twitter"]   = Prop(p => p.Platform == "Twitter"),
            ["platform_WhatsApp"]  = Prop(p => p.Platform == "WhatsApp"),
            ["platform_YouTube"]   = Prop(p => p.Platform == "YouTube"),
            // Content topic proportions
            ["content_topic_AwarenessRaising"] = Prop(p => p.ContentTopic == "AwarenessRaising"),
            ["content_topic_CampaignLaunch"]   = Prop(p => p.ContentTopic == "CampaignLaunch"),
            ["content_topic_DonorImpact"]      = Prop(p => p.ContentTopic == "DonorImpact"),
            ["content_topic_Education"]        = Prop(p => p.ContentTopic == "Education"),
            ["content_topic_EventRecap"]       = Prop(p => p.ContentTopic == "EventRecap"),
            ["content_topic_Gratitude"]        = Prop(p => p.ContentTopic == "Gratitude"),
            ["content_topic_Health"]           = Prop(p => p.ContentTopic == "Health"),
            ["content_topic_Reintegration"]    = Prop(p => p.ContentTopic == "Reintegration"),
            ["content_topic_SafehouseLife"]    = Prop(p => p.ContentTopic == "SafehouseLife"),
            // Post type proportions
            ["post_type_Campaign"]           = Prop(p => p.PostType == "Campaign"),
            ["post_type_EducationalContent"] = Prop(p => p.PostType == "EducationalContent"),
            ["post_type_EventPromotion"]     = Prop(p => p.PostType == "EventPromotion"),
            ["post_type_FundraisingAppeal"]  = Prop(p => p.PostType == "FundraisingAppeal"),
            ["post_type_ImpactStory"]        = Prop(p => p.PostType == "ImpactStory"),
            ["post_type_ThankYou"]           = Prop(p => p.PostType == "ThankYou"),
        };

        var (ok, body) = await ProxyToMlRaw("predict/monthly-donations", new { month, features });
        if (!ok) return null;

        return JsonSerializer.Deserialize<JsonElement>(body);
    }

    private static Dictionary<string, object?> BuildDonorBaseFeatures(
        Supporter supporter,
        IReadOnlyList<Donation> donations)
    {
        var today             = DateTime.UtcNow.Date;
        var monetaryDonations = donations.Where(d => d.DonationType == "Monetary" && d.Amount.HasValue).ToList();
        int monetaryCount     = monetaryDonations.Count;
        double avgGift        = monetaryCount > 0 ? (double)monetaryDonations.Average(d => d.Amount!.Value) : 0;
        int uniqueCampaigns   = donations.Select(d => d.CampaignName).Distinct().Count();
        int donationTypeCount = donations.Select(d => d.DonationType).Distinct().Count();
        bool isRecurring      = donations.Any(d => d.IsRecurring);

        double daysSinceFirstDonation = supporter.FirstDonationDate.HasValue
            ? (today - supporter.FirstDonationDate.Value.ToDateTime(TimeOnly.MinValue).Date).TotalDays
            : -1;
        double daysSinceCreated = (today - supporter.CreatedAt.Date).TotalDays;

        return new Dictionary<string, object?>
        {
            ["monetary_donation_count"]   = monetaryCount,
            ["avg_monetary_gift"]         = avgGift,
            ["unique_campaigns"]          = uniqueCampaigns,
            ["donation_types_count"]      = donationTypeCount,
            ["days_since_first_donation"] = daysSinceFirstDonation,
            ["days_since_created"]        = daysSinceCreated,
            ["supporter_type"]            = supporter.SupporterType,
            ["relationship_type"]         = supporter.RelationshipType,
            ["country"]                   = supporter.Country ?? "Unknown",
            ["region"]                    = supporter.Region  ?? "Unknown",
            ["status"]                    = supporter.Status,
            ["acquisition_channel"]       = supporter.AcquisitionChannel ?? "Unknown",
            ["is_recurring_donor"]        = isRecurring,
        };
    }

    private async Task<(bool ok, string body)> ProxyToMlRaw(string path, object payload)
    {
        try
        {
            var client   = _httpFactory.CreateClient("MLService");
            var response = await client.PostAsJsonAsync(path, payload);
            var body     = await response.Content.ReadAsStringAsync();
            return (response.IsSuccessStatusCode, body);
        }
        catch (Exception ex)
        {
            return (false, ex.Message);
        }
    }
}
