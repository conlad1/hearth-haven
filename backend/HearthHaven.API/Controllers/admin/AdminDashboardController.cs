using HearthHaven.API.Data;
using HearthHaven.API.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace HearthHaven.API.Controllers;

[Authorize(Roles = $"{AppRoles.Admin},{AppRoles.CaseManager},{AppRoles.DonationsManager},{AppRoles.OutreachManager}")]
[Route("[controller]")]
[ApiController]
public class AdminDashboardController : ControllerBase
{
    private readonly HearthHavenDbContext _context;

    public AdminDashboardController(HearthHavenDbContext context) => _context = context;

    // ═══════════════════════════════════════════════════════════════════════════
    // NEW: Role-specific dashboard endpoints
    // ═══════════════════════════════════════════════════════════════════════════

    /// <summary>
    /// Four top-level KPI numbers shown at the top of every dashboard tab.
    /// </summary>
    [HttpGet("TopStats")]
    public IActionResult GetTopStats()
    {
        var startOfMonth = new DateOnly(DateTime.UtcNow.Year, DateTime.UtcNow.Month, 1);

        var activeResidents = _context.Residents.Count(r => r.CaseStatus == "Active");
        var activeDonors    = _context.Supporters.Count(s => s.Status == "Active");
        var monthlyDonations = _context.Donations
            .Where(d => d.DonationDate >= startOfMonth && d.Amount.HasValue)
            .Sum(d => (decimal?)d.Amount) ?? 0;
        var totalMonetary  = _context.Donations
            .Where(d => d.Amount.HasValue)
            .Sum(d => (decimal?)d.Amount) ?? 0;
        var totalAllocated = _context.DonationAllocations
            .Sum(a => (decimal?)a.AmountAllocated) ?? 0;
        var unallocated = (double)Math.Max(0m, totalMonetary - totalAllocated);

        return Ok(new
        {
            activeResidents,
            activeDonors,
            monthlyDonations = (double)monthlyDonations,
            unallocatedFunds = unallocated,
        });
    }

    /// <summary>
    /// Case management dashboard: triage counts, escalated-risk residents,
    /// safehouse occupancy, and recent incidents.
    /// Reintegration candidates come from POST /MLPredict/reintegration/top-candidates.
    /// </summary>
    [HttpGet("CaseManager")]
    public IActionResult GetCaseManager()
    {
        var today  = DateOnly.FromDateTime(DateTime.UtcNow);
        var cutoff = DateOnly.FromDateTime(DateTime.UtcNow.AddDays(-30));

        // Triage counts
        var highCriticalRisk = _context.Residents.Count(r =>
            r.CaseStatus == "Active" &&
            (r.CurrentRiskLevel == "High" || r.CurrentRiskLevel == "Critical"));
        var unresolvedIncidents  = _context.IncidentReports.Count(i => !i.Resolved);
        var flaggedSessions      = _context.ProcessRecordings.Count(p => p.ConcernsFlagged);
        var upcomingConferences  = _context.InterventionPlans.Count(ip =>
            ip.CaseConferenceDate != null &&
            ip.CaseConferenceDate >= today &&
            ip.Status != "Closed" && ip.Status != "Achieved");

        // Escalated residents: current risk level worse than at admission
        var riskRank = new Dictionary<string, int>
            { { "Low", 0 }, { "Medium", 1 }, { "High", 2 }, { "Critical", 3 } };

        var activeResidents = _context.Residents
            .Where(r => r.CaseStatus == "Active")
            .Select(r => new
            {
                r.ResidentId,
                r.CaseControlNo,
                r.InitialRiskLevel,
                r.CurrentRiskLevel,
                safehouseName = _context.Safehouses
                    .Where(s => s.SafehouseId == r.SafehouseId)
                    .Select(s => s.Name)
                    .FirstOrDefault(),
            })
            .ToList();

        var escalated = activeResidents
            .Where(r =>
                riskRank.TryGetValue(r.InitialRiskLevel, out var init) &&
                riskRank.TryGetValue(r.CurrentRiskLevel,  out var curr) &&
                curr > init)
            .Select(r => new
            {
                r.ResidentId,
                r.CaseControlNo,
                r.InitialRiskLevel,
                r.CurrentRiskLevel,
                r.safehouseName,
            })
            .ToList();

        // Safehouse occupancy
        var occupancy = _context.Safehouses
            .Where(s => s.Status == "Active")
            .OrderBy(s => s.Name)
            .Select(s => new
            {
                s.SafehouseId,
                s.Name,
                s.Region,
                s.CapacityGirls,
                activeResidents = _context.Residents.Count(r =>
                    r.SafehouseId == s.SafehouseId && r.CaseStatus == "Active"),
            })
            .ToList();

        // Recent incidents (unresolved first)
        var recentIncidents = _context.IncidentReports
            .Where(i => i.IncidentDate >= cutoff)
            .OrderBy(i => i.Resolved)
            .ThenByDescending(i => i.IncidentDate)
            .Take(10)
            .Select(i => new
            {
                i.IncidentId,
                i.ResidentId,
                residentCode = _context.Residents
                    .Where(r => r.ResidentId == i.ResidentId)
                    .Select(r => r.CaseControlNo)
                    .FirstOrDefault(),
                safehouseName = _context.Safehouses
                    .Where(s => s.SafehouseId == i.SafehouseId)
                    .Select(s => s.Name)
                    .FirstOrDefault(),
                i.IncidentDate,
                i.IncidentType,
                i.Severity,
                i.Resolved,
                i.FollowUpRequired,
                i.ReportedBy,
            })
            .ToList();

        return Ok(new
        {
            triage = new
            {
                highCriticalRisk,
                unresolvedIncidents,
                flaggedSessions,
                upcomingConferences,
            },
            escalatedResidents = escalated,
            safehouseOccupancy = occupancy,
            recentIncidents,
        });
    }

    /// <summary>
    /// Monthly education-progress and health-score trends for the last 12 months.
    /// Risk-driver and intervention-driver causal data is served as static JSON
    /// from /public/causal/ on the frontend.
    /// </summary>
    [HttpGet("CaseAnalytics")]
    public IActionResult GetCaseAnalytics()
    {
        var cutoff = DateOnly.FromDateTime(DateTime.UtcNow.AddMonths(-12));

        var eduTrend = _context.EducationRecords
            .Where(e => e.RecordDate >= cutoff)
            .AsEnumerable()
            .GroupBy(e => new { e.RecordDate.Year, e.RecordDate.Month })
            .OrderBy(g => g.Key.Year).ThenBy(g => g.Key.Month)
            .Select(g => new
            {
                month      = new DateOnly(g.Key.Year, g.Key.Month, 1).ToString("MMM yyyy"),
                avgProgress = Math.Round(g.Average(e => (double)e.ProgressPercent), 1),
            })
            .ToList();

        var healthTrend = _context.HealthWellbeingRecords
            .Where(h => h.RecordDate >= cutoff && h.GeneralHealthScore.HasValue)
            .AsEnumerable()
            .GroupBy(h => new { h.RecordDate.Year, h.RecordDate.Month })
            .OrderBy(g => g.Key.Year).ThenBy(g => g.Key.Month)
            .Select(g => new
            {
                month    = new DateOnly(g.Key.Year, g.Key.Month, 1).ToString("MMM yyyy"),
                avgScore = Math.Round(g.Average(h => (double)h.GeneralHealthScore!.Value), 1),
            })
            .ToList();

        return Ok(new { monthlyEducationProgress = eduTrend, monthlyHealthScores = healthTrend });
    }

    /// <summary>
    /// Donor management: stats, 12-month donation trend, recent donations,
    /// and volunteers/partners table. At-risk / upgrade candidates come from
    /// POST /MLPredict/donors/top-lapse-risk and top-upgrade-potential.
    /// </summary>
    [HttpGet("DonorManager")]
    public IActionResult GetDonorManager()
    {
        var startOfMonth = new DateOnly(DateTime.UtcNow.Year, DateTime.UtcNow.Month, 1);
        var cutoff12     = DateOnly.FromDateTime(DateTime.UtcNow.AddMonths(-12));
        var sixMonthsAgo = DateOnly.FromDateTime(DateTime.UtcNow.AddMonths(-6));

        var donationsThisMonth = _context.Donations
            .Where(d => d.DonationDate >= startOfMonth && d.Amount.HasValue)
            .Sum(d => (decimal?)d.Amount) ?? 0;

        var activeDonors = _context.Supporters.Count(s => s.Status == "Active");

        var atRiskCount = _context.Supporters.Count(s =>
            s.Status == "Lapsed" ||
            (s.Status == "Active" && s.FirstDonationDate.HasValue &&
             !_context.Donations.Any(d => d.SupporterId == s.SupporterId &&
                                          d.DonationDate >= sixMonthsAgo)));

        var totalMonetary  = _context.Donations.Where(d => d.Amount.HasValue).Sum(d => (decimal?)d.Amount) ?? 0;
        var totalAllocated = _context.DonationAllocations.Sum(a => (decimal?)a.AmountAllocated) ?? 0;
        var unallocated    = (double)Math.Max(0m, totalMonetary - totalAllocated);

        // 12-month donation trend
        var donationTrend = _context.Donations
            .Where(d => d.DonationDate >= cutoff12 && d.Amount.HasValue)
            .AsEnumerable()
            .GroupBy(d => new { d.DonationDate.Year, d.DonationDate.Month })
            .OrderBy(g => g.Key.Year).ThenBy(g => g.Key.Month)
            .Select(g => new
            {
                month = new DateOnly(g.Key.Year, g.Key.Month, 1).ToString("MMM yyyy"),
                total = Math.Round(g.Sum(d => (double)d.Amount!.Value), 2),
                count = g.Count(),
            })
            .ToList();

        // Recent donations
        var recentDonations = _context.Donations
            .OrderByDescending(d => d.DonationDate)
            .Take(15)
            .Select(d => new
            {
                d.DonationId,
                d.DonationDate,
                d.DonationType,
                d.Amount,
                d.EstimatedValue,
                d.CampaignName,
                d.IsRecurring,
                supporterName = _context.Supporters
                    .Where(s => s.SupporterId == d.SupporterId)
                    .Select(s => s.DisplayName)
                    .FirstOrDefault(),
                supporterEmail = _context.Supporters
                    .Where(s => s.SupporterId == d.SupporterId)
                    .Select(s => s.Email)
                    .FirstOrDefault(),
                totalAllocated = _context.DonationAllocations
                    .Where(a => a.DonationId == d.DonationId)
                    .Sum(a => (decimal?)a.AmountAllocated) ?? 0,
            })
            .ToList();

        // Volunteers & partners (non-monetary supporters)
        var volunteersPartners = _context.Supporters
            .Where(s => s.SupporterType == "Volunteer" || s.SupporterType == "Partner" ||
                        s.SupporterType == "Corporate" || s.RelationshipType == "Non-monetary")
            .OrderByDescending(s => s.CreatedAt)
            .Take(20)
            .Select(s => new
            {
                s.SupporterId,
                s.DisplayName,
                s.SupporterType,
                s.RelationshipType,
                s.Status,
                s.Country,
                s.Region,
                inKindTotal = _context.Donations
                    .Where(d => d.SupporterId == s.SupporterId && d.EstimatedValue.HasValue)
                    .Sum(d => (decimal?)d.EstimatedValue) ?? 0,
            })
            .ToList();

        return Ok(new
        {
            stats = new
            {
                donationsThisMonth = (double)donationsThisMonth,
                activeDonors,
                atRiskCount,
                unallocatedFunds   = unallocated,
            },
            donationTrend,
            recentDonations,
            volunteersPartners,
        });
    }

    /// <summary>
    /// Allocation summary: total received vs allocated vs unallocated gap,
    /// breakdown by program area, and dropdown options for the create-allocation form.
    /// </summary>
    [HttpGet("DonorAllocations")]
    public IActionResult GetDonorAllocations()
    {
        var totalMonetary  = _context.Donations.Where(d => d.Amount.HasValue).Sum(d => (decimal?)d.Amount) ?? 0;
        var totalAllocated = _context.DonationAllocations.Sum(a => (decimal?)a.AmountAllocated) ?? 0;
        var unallocated    = Math.Max(0m, totalMonetary - totalAllocated);

        var byProgramArea = _context.DonationAllocations
            .GroupBy(a => a.ProgramArea)
            .Select(g => new
            {
                programArea    = g.Key,
                totalAllocated = g.Sum(a => (decimal?)a.AmountAllocated) ?? 0,
            })
            .OrderByDescending(x => x.totalAllocated)
            .ToList();

        var safehouses = _context.Safehouses
            .Where(s => s.Status == "Active")
            .OrderBy(s => s.Name)
            .Select(s => new { s.SafehouseId, s.Name })
            .ToList();

        var existingAreas = _context.DonationAllocations
            .Select(a => a.ProgramArea)
            .Distinct()
            .ToList();

        var defaultAreas = new[] { "Education", "Healthcare", "Shelter", "Livelihood", "Operations", "Advocacy" };
        var programAreas = existingAreas
            .Union(defaultAreas)
            .OrderBy(p => p)
            .ToList();

        // Unallocated monetary donations (with remaining balance) for the form
        var unallocatedDonations = _context.Donations
            .Where(d => d.DonationType == "Monetary" && d.Amount.HasValue)
            .Select(d => new
            {
                d.DonationId,
                d.DonationDate,
                d.Amount,
                supporterName = _context.Supporters
                    .Where(s => s.SupporterId == d.SupporterId)
                    .Select(s => s.DisplayName)
                    .FirstOrDefault(),
                allocated = _context.DonationAllocations
                    .Where(a => a.DonationId == d.DonationId)
                    .Sum(a => (decimal?)a.AmountAllocated) ?? 0,
            })
            .AsEnumerable()
            .Where(d => d.Amount!.Value - d.allocated > 0)
            .OrderByDescending(d => d.DonationDate)
            .Take(30)
            .Select(d => new
            {
                d.DonationId,
                d.DonationDate,
                d.Amount,
                d.supporterName,
                remaining = d.Amount!.Value - d.allocated,
            })
            .ToList();

        return Ok(new
        {
            totalReceived  = (double)totalMonetary,
            totalAllocated = (double)totalAllocated,
            unallocated    = (double)unallocated,
            byProgramArea,
            safehouses,
            programAreas,
            unallocatedDonations,
        });
    }

    /// <summary>
    /// Create a new donation allocation.
    /// </summary>
    [HttpPost("DonorAllocations")]
    public IActionResult CreateAllocation([FromBody] CreateAllocationRequest req)
    {
        if (req.AmountAllocated <= 0)
            return BadRequest("Amount must be greater than zero.");

        var donation = _context.Donations.Find(req.DonationId);
        if (donation is null) return NotFound("Donation not found.");
        if (donation.DonationType != "Monetary" || !donation.Amount.HasValue)
            return BadRequest("Only monetary donations can be allocated.");

        var alreadyAllocated = _context.DonationAllocations
            .Where(a => a.DonationId == req.DonationId)
            .Sum(a => (decimal?)a.AmountAllocated) ?? 0;

        var remaining = donation.Amount.Value - alreadyAllocated;
        if ((decimal)req.AmountAllocated > remaining)
            return BadRequest($"Exceeds remaining balance of {remaining:C}.");

        if (_context.Safehouses.Find(req.SafehouseId) is null)
            return NotFound("Safehouse not found.");

        var allocation = new DonationAllocation
        {
            DonationId      = req.DonationId,
            SafehouseId     = req.SafehouseId,
            ProgramArea     = req.ProgramArea,
            AmountAllocated = (decimal)req.AmountAllocated,
            AllocationDate  = DateOnly.FromDateTime(DateTime.UtcNow),
            AllocationNotes = req.Notes,
        };

        _context.DonationAllocations.Add(allocation);
        _context.SaveChanges();

        return StatusCode(201, new { allocation.AllocationId, message = "Allocation created." });
    }

    /// <summary>
    /// Social media manager dashboard: action queue (posts missing metrics),
    /// monthly stats, 12-month engagement and referral trends, and top posts.
    /// ML-predicted next month donations come from POST /MLPredict/monthly-donations/{month}.
    /// </summary>
    [HttpGet("SocialMediaManager")]
    public IActionResult GetSocialMediaManager()
    {
        var startOfMonth = new DateOnly(DateTime.UtcNow.Year, DateTime.UtcNow.Month, 1).ToDateTime(TimeOnly.MinValue);
        var cutoff12     = DateTime.UtcNow.AddMonths(-12);
        var cutoff90     = DateTime.UtcNow.AddDays(-90);

        // Action queue: posts with no impressions recorded yet
        var actionQueue = _context.SocialMediaPosts
            .Where(p => p.Impressions == 0 && p.Reach == 0)
            .OrderByDescending(p => p.CreatedAt)
            .Take(20)
            .Select(p => new
            {
                p.PostId,
                p.Platform,
                p.PostType,
                p.ContentTopic,
                caption = p.Caption != null && p.Caption.Length > 80
                    ? p.Caption.Substring(0, 80) + "…"
                    : p.Caption,
                createdAt = p.CreatedAt.ToString("MMM d, yyyy"),
            })
            .ToList();

        // Stats for this month
        var postsThisMonth = _context.SocialMediaPosts
            .Where(p => p.CreatedAt >= startOfMonth)
            .ToList();

        var avgEngagement     = postsThisMonth.Count > 0
            ? Math.Round(postsThisMonth.Average(p => (double)p.EngagementRate) * 100, 1)
            : 0.0;
        var referralsThisMonth = postsThisMonth.Sum(p => p.DonationReferrals);

        // 12-month engagement trend
        var engagementTrend = _context.SocialMediaPosts
            .Where(p => p.CreatedAt >= cutoff12)
            .AsEnumerable()
            .GroupBy(p => new { p.CreatedAt.Year, p.CreatedAt.Month })
            .OrderBy(g => g.Key.Year).ThenBy(g => g.Key.Month)
            .Select(g => new
            {
                month         = new DateOnly(g.Key.Year, g.Key.Month, 1).ToString("MMM yyyy"),
                avgEngagement = Math.Round(g.Average(p => (double)p.EngagementRate) * 100, 2),
                postCount     = g.Count(),
            })
            .ToList();

        // 12-month referral trend
        var referralTrend = _context.SocialMediaPosts
            .Where(p => p.CreatedAt >= cutoff12)
            .AsEnumerable()
            .GroupBy(p => new { p.CreatedAt.Year, p.CreatedAt.Month })
            .OrderBy(g => g.Key.Year).ThenBy(g => g.Key.Month)
            .Select(g => new
            {
                month          = new DateOnly(g.Key.Year, g.Key.Month, 1).ToString("MMM yyyy"),
                totalReferrals = g.Sum(p => p.DonationReferrals),
            })
            .ToList();

        // Top posts by engagement (last 90 days, must have impressions)
        var topPosts = _context.SocialMediaPosts
            .Where(p => p.CreatedAt >= cutoff90 && p.Impressions > 0)
            .OrderByDescending(p => p.EngagementRate)
            .Take(6)
            .Select(p => new
            {
                p.PostId,
                p.Platform,
                p.PostType,
                p.ContentTopic,
                caption = p.Caption != null && p.Caption.Length > 100
                    ? p.Caption.Substring(0, 100) + "…"
                    : p.Caption,
                p.Likes,
                p.Comments,
                p.Shares,
                p.DonationReferrals,
                engagementPct = Math.Round((double)p.EngagementRate * 100, 1),
                createdAt     = p.CreatedAt.ToString("MMM d, yyyy"),
            })
            .ToList();

        return Ok(new
        {
            actionQueue,
            avgEngagementThisMonth = avgEngagement,
            referralsThisMonth,
            engagementTrend,
            referralTrend,
            topPosts,
        });
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // EXISTING: Original admin-only endpoints (kept as-is)
    // ═══════════════════════════════════════════════════════════════════════════

    /// <summary>
    /// High-level KPI metrics for the admin command center.
    /// </summary>
    [HttpGet("Stats")]
    public IActionResult GetStats()
    {
        var activeResidents = _context.Residents.Count(r => r.CaseStatus == "Active");
        var totalResidents = _context.Residents.Count();
        var activeSafehouses = _context.Safehouses.Count(s => s.Status == "Active");
        var highRiskCount = _context.Residents.Count(r =>
            r.CaseStatus == "Active" &&
            (r.CurrentRiskLevel == "High" || r.CurrentRiskLevel == "Critical"));

        var thirtyDaysAgo = DateOnly.FromDateTime(DateTime.UtcNow.AddDays(-30));

        var recentDonationCount = _context.Donations.Count(d => d.DonationDate >= thirtyDaysAgo);
        var recentDonationTotal = _context.Donations
            .Where(d => d.DonationDate >= thirtyDaysAgo && d.Amount.HasValue)
            .Sum(d => d.Amount) ?? 0;

        var unresolvedIncidents = _context.IncidentReports.Count(i => !i.Resolved);
        var pendingFollowUpVisits = _context.HomeVisitations.Count(v => v.FollowUpNeeded);
        var flaggedSessions = _context.ProcessRecordings.Count(p => p.ConcernsFlagged);

        var upcomingConferences = _context.InterventionPlans
            .Count(ip => ip.CaseConferenceDate != null &&
                         ip.CaseConferenceDate >= DateOnly.FromDateTime(DateTime.UtcNow) &&
                         ip.Status != "Closed" && ip.Status != "Achieved");

        var activePartners = _context.Partners.Count(p => p.Status == "Active");

        return Ok(new
        {
            activeResidents,
            totalResidents,
            activeSafehouses,
            highRiskCount,
            recentDonationCount,
            recentDonationTotal,
            unresolvedIncidents,
            pendingFollowUpVisits,
            flaggedSessions,
            upcomingConferences,
            activePartners,
        });
    }

    /// <summary>
    /// Safehouse occupancy overview.
    /// </summary>
    [HttpGet("SafehouseOccupancy")]
    public IActionResult GetSafehouseOccupancy()
    {
        var safehouses = _context.Safehouses
            .Where(s => s.Status == "Active")
            .OrderBy(s => s.Name)
            .Select(s => new
            {
                s.SafehouseId,
                s.Name,
                s.Region,
                s.CapacityGirls,
                s.CurrentOccupancy,
                activeResidents = _context.Residents.Count(r =>
                    r.SafehouseId == s.SafehouseId && r.CaseStatus == "Active"),
            })
            .ToList();

        return Ok(safehouses);
    }

    /// <summary>
    /// Recent incidents across all safehouses (last 30 days, unresolved first).
    /// </summary>
    [HttpGet("RecentIncidents")]
    public IActionResult GetRecentIncidents(int limit = 10)
    {
        var cutoff = DateOnly.FromDateTime(DateTime.UtcNow.AddDays(-30));

        var incidents = _context.IncidentReports
            .Where(i => i.IncidentDate >= cutoff)
            .OrderBy(i => i.Resolved)
            .ThenByDescending(i => i.IncidentDate)
            .Take(limit)
            .Select(i => new
            {
                i.IncidentId,
                i.ResidentId,
                residentCode = _context.Residents
                    .Where(r => r.ResidentId == i.ResidentId)
                    .Select(r => r.CaseControlNo)
                    .FirstOrDefault(),
                safehouseName = _context.Safehouses
                    .Where(s => s.SafehouseId == i.SafehouseId)
                    .Select(s => s.Name)
                    .FirstOrDefault(),
                i.IncidentDate,
                i.IncidentType,
                i.Severity,
                i.Resolved,
                i.FollowUpRequired,
                i.ReportedBy,
                i.Description,
            })
            .ToList();

        return Ok(incidents);
    }

    /// <summary>
    /// Recent home visitations across all residents (last 30 days, safety concerns first).
    /// </summary>
    [HttpGet("RecentVisitations")]
    public IActionResult GetRecentVisitations(int limit = 10)
    {
        var cutoff = DateOnly.FromDateTime(DateTime.UtcNow.AddDays(-30));

        var visitations = _context.HomeVisitations
            .Where(v => v.VisitDate >= cutoff)
            .OrderByDescending(v => v.SafetyConcernsNoted)
            .ThenByDescending(v => v.VisitDate)
            .Take(limit)
            .Select(v => new
            {
                v.VisitationId,
                v.ResidentId,
                residentCode = _context.Residents
                    .Where(r => r.ResidentId == v.ResidentId)
                    .Select(r => r.CaseControlNo)
                    .FirstOrDefault(),
                v.VisitDate,
                v.SocialWorker,
                v.VisitType,
                v.VisitOutcome,
                v.SafetyConcernsNoted,
                v.FollowUpNeeded,
                v.FamilyCooperationLevel,
            })
            .ToList();

        return Ok(visitations);
    }

    /// <summary>
    /// Counseling sessions with concerns flagged (last 30 days).
    /// </summary>
    [HttpGet("ConcerningSessions")]
    public IActionResult GetConcerningSessions(int limit = 10)
    {
        var cutoff = DateOnly.FromDateTime(DateTime.UtcNow.AddDays(-30));

        var sessions = _context.ProcessRecordings
            .Where(p => p.ConcernsFlagged && p.SessionDate >= cutoff)
            .OrderByDescending(p => p.SessionDate)
            .Take(limit)
            .Select(p => new
            {
                p.RecordingId,
                p.ResidentId,
                residentCode = _context.Residents
                    .Where(r => r.ResidentId == p.ResidentId)
                    .Select(r => r.CaseControlNo)
                    .FirstOrDefault(),
                p.SessionDate,
                p.SocialWorker,
                p.SessionType,
                p.EmotionalStateObserved,
                p.EmotionalStateEnd,
                p.ReferralMade,
                p.FollowUpActions,
            })
            .ToList();

        return Ok(sessions);
    }

    /// <summary>
    /// Upcoming case conferences (intervention plans with future conference dates).
    /// </summary>
    [HttpGet("UpcomingConferences")]
    public IActionResult GetUpcomingConferences(int limit = 10)
    {
        var today = DateOnly.FromDateTime(DateTime.UtcNow);

        var plans = _context.InterventionPlans
            .Where(ip => ip.CaseConferenceDate != null &&
                         ip.CaseConferenceDate >= today &&
                         ip.Status != "Closed" && ip.Status != "Achieved")
            .OrderBy(ip => ip.CaseConferenceDate)
            .Take(limit)
            .Select(ip => new
            {
                ip.PlanId,
                ip.ResidentId,
                residentCode = _context.Residents
                    .Where(r => r.ResidentId == ip.ResidentId)
                    .Select(r => r.CaseControlNo)
                    .FirstOrDefault(),
                ip.PlanCategory,
                ip.PlanDescription,
                ip.Status,
                ip.CaseConferenceDate,
                ip.TargetDate,
            })
            .ToList();

        return Ok(plans);
    }

    /// <summary>
    /// High-risk residents (Active cases with High or Critical risk).
    /// </summary>
    [HttpGet("HighRiskResidents")]
    public IActionResult GetHighRiskResidents(int limit = 10)
    {
        var residents = _context.Residents
            .Where(r => r.CaseStatus == "Active" &&
                        (r.CurrentRiskLevel == "High" || r.CurrentRiskLevel == "Critical"))
            .OrderByDescending(r => r.CurrentRiskLevel == "Critical" ? 1 : 0)
            .ThenBy(r => r.CaseControlNo)
            .Take(limit)
            .Select(r => new
            {
                r.ResidentId,
                r.CaseControlNo,
                r.InternalCode,
                r.CurrentRiskLevel,
                r.CaseCategory,
                r.AssignedSocialWorker,
                safehouseName = _context.Safehouses
                    .Where(s => s.SafehouseId == r.SafehouseId)
                    .Select(s => s.Name)
                    .FirstOrDefault(),
                r.DateOfAdmission,
            })
            .ToList();

        return Ok(residents);
    }

    /// <summary>
    /// Recent unallocated or partially allocated donations.
    /// </summary>
    [HttpGet("RecentDonations")]
    public IActionResult GetRecentDonations(int limit = 10)
    {
        var donations = _context.Donations
            .OrderByDescending(d => d.DonationDate)
            .Take(limit)
            .Select(d => new
            {
                d.DonationId,
                d.DonationType,
                d.DonationDate,
                d.Amount,
                d.EstimatedValue,
                d.CampaignName,
                d.IsRecurring,
                supporterName = _context.Supporters
                    .Where(s => s.SupporterId == d.SupporterId)
                    .Select(s => s.DisplayName)
                    .FirstOrDefault(),
                totalAllocated = _context.DonationAllocations
                    .Where(a => a.DonationId == d.DonationId)
                    .Sum(a => (decimal?)a.AmountAllocated) ?? 0,
            })
            .ToList();

        return Ok(donations);
    }
}

// ── DTOs ───────────────────────────────────────────────────────────────────────

public class CreateAllocationRequest
{
    public int DonationId { get; set; }
    public int SafehouseId { get; set; }
    public required string ProgramArea { get; set; }
    public double AmountAllocated { get; set; }
    public string? Notes { get; set; }
}
