using HearthHaven.API.Data;
using HearthHaven.API.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace HearthHaven.API.Controllers;

[Authorize(Roles = $"{AppRoles.Admin},{AppRoles.CaseManager},{AppRoles.DonationsManager},{AppRoles.OutreachManager}")]
[Route("[controller]")]
[ApiController]
public class DashboardController : ControllerBase
{
    private readonly HearthHavenDbContext _db;

    public DashboardController(HearthHavenDbContext db) => _db = db;

    // ── GET /Dashboard/TopStats ───────────────────────────────────────────────

    /// <summary>
    /// Four top-level KPI numbers shown at the top of every dashboard tab.
    /// </summary>
    [HttpGet("TopStats")]
    public IActionResult GetTopStats()
    {
        var startOfMonth = new DateOnly(DateTime.UtcNow.Year, DateTime.UtcNow.Month, 1);

        var activeResidents  = _db.Residents.Count(r => r.CaseStatus == "Active");
        var activeDonors     = _db.Supporters.Count(s => s.Status == "Active");
        var monthlyDonations = _db.Donations
            .Where(d => d.DonationDate >= startOfMonth && d.Amount.HasValue)
            .Sum(d => (decimal?)d.Amount) ?? 0;
        var totalMonetary  = _db.Donations
            .Where(d => d.Amount.HasValue)
            .Sum(d => (decimal?)d.Amount) ?? 0;
        var totalAllocated = _db.DonationAllocations
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

    // ── GET /Dashboard/CaseManager ────────────────────────────────────────────

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
        var highCriticalRisk = _db.Residents.Count(r =>
            r.CaseStatus == "Active" &&
            (r.CurrentRiskLevel == "High" || r.CurrentRiskLevel == "Critical"));
        var unresolvedIncidents = _db.IncidentReports.Count(i => !i.Resolved);
        var flaggedSessions     = _db.ProcessRecordings.Count(p => p.ConcernsFlagged);
        var upcomingConferences = _db.InterventionPlans.Count(ip =>
            ip.CaseConferenceDate != null &&
            ip.CaseConferenceDate >= today &&
            ip.Status != "Closed" && ip.Status != "Achieved");

        // Escalated residents: current risk level worse than at admission
        var riskRank = new Dictionary<string, int>
            { { "Low", 0 }, { "Medium", 1 }, { "High", 2 }, { "Critical", 3 } };

        var activeResidents = _db.Residents
            .Where(r => r.CaseStatus == "Active")
            .Select(r => new
            {
                r.ResidentId,
                r.CaseControlNo,
                r.InitialRiskLevel,
                r.CurrentRiskLevel,
                safehouseName = _db.Safehouses
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
        var occupancy = _db.Safehouses
            .Where(s => s.Status == "Active")
            .OrderBy(s => s.Name)
            .Select(s => new
            {
                s.SafehouseId,
                s.Name,
                s.Region,
                s.CapacityGirls,
                activeResidents = _db.Residents.Count(r =>
                    r.SafehouseId == s.SafehouseId && r.CaseStatus == "Active"),
            })
            .ToList();

        // Recent incidents (unresolved first)
        var recentIncidents = _db.IncidentReports
            .Where(i => i.IncidentDate >= cutoff)
            .OrderBy(i => i.Resolved)
            .ThenByDescending(i => i.IncidentDate)
            .Take(10)
            .Select(i => new
            {
                i.IncidentId,
                i.ResidentId,
                residentCode = _db.Residents
                    .Where(r => r.ResidentId == i.ResidentId)
                    .Select(r => r.CaseControlNo)
                    .FirstOrDefault(),
                safehouseName = _db.Safehouses
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

    // ── GET /Dashboard/CaseAnalytics ──────────────────────────────────────────

    /// <summary>
    /// Monthly education-progress and health-score trends for the last 12 months.
    /// Risk-driver and intervention-driver causal data is served as static JSON
    /// from /public/causal/ on the frontend.
    /// </summary>
    [HttpGet("CaseAnalytics")]
    public IActionResult GetCaseAnalytics()
    {
        var cutoff = DateOnly.FromDateTime(DateTime.UtcNow.AddMonths(-12));

        var eduTrend = _db.EducationRecords
            .Where(e => e.RecordDate >= cutoff)
            .AsEnumerable()
            .GroupBy(e => new { e.RecordDate.Year, e.RecordDate.Month })
            .OrderBy(g => g.Key.Year).ThenBy(g => g.Key.Month)
            .Select(g => new
            {
                month       = new DateOnly(g.Key.Year, g.Key.Month, 1).ToString("MMM yyyy"),
                avgProgress = Math.Round(g.Average(e => (double)e.ProgressPercent), 1),
            })
            .ToList();

        var healthTrend = _db.HealthWellbeingRecords
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

        // Safety concerns vs no concerns — avg risk level (Low=1, Medium=2, High=3, Critical=4)
        var riskScore = new Dictionary<string, int>
            { { "Low", 1 }, { "Medium", 2 }, { "High", 3 }, { "Critical", 4 } };

        var residentIdsWithConcerns = _db.ProcessRecordings
            .Where(p => p.ConcernsFlagged)
            .Select(p => p.ResidentId)
            .Distinct()
            .ToHashSet();

        var activeResidentRisks = _db.Residents
            .Where(r => r.CaseStatus == "Active" && r.CurrentRiskLevel != null)
            .Select(r => new { r.ResidentId, r.CurrentRiskLevel })
            .ToList();

        var safetyRiskComparison = activeResidentRisks
            .Where(r => riskScore.ContainsKey(r.CurrentRiskLevel!))
            .GroupBy(r => residentIdsWithConcerns.Contains(r.ResidentId))
            .Select(g => new
            {
                group        = g.Key ? "Concerns Flagged" : "No Concerns Flagged",
                avgRiskLevel = Math.Round(g.Average(r => (double)riskScore[r.CurrentRiskLevel!]), 2),
                count        = g.Count(),
            })
            .OrderByDescending(g => g.avgRiskLevel)
            .ToList();

        return Ok(new
        {
            monthlyEducationProgress = eduTrend,
            monthlyHealthScores      = healthTrend,
            safetyRiskComparison,
        });
    }

    // ── GET /Dashboard/DonorManager ───────────────────────────────────────────

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

        var donationsThisMonth = _db.Donations
            .Where(d => d.DonationDate >= startOfMonth && d.Amount.HasValue)
            .Sum(d => (decimal?)d.Amount) ?? 0;

        var activeDonors = _db.Supporters.Count(s => s.Status == "Active");

        var atRiskCount = _db.Supporters.Count(s =>
            s.Status == "Lapsed" ||
            (s.Status == "Active" && s.FirstDonationDate.HasValue &&
             !_db.Donations.Any(d => d.SupporterId == s.SupporterId &&
                                     d.DonationDate >= sixMonthsAgo)));

        var totalMonetary  = _db.Donations.Where(d => d.Amount.HasValue).Sum(d => (decimal?)d.Amount) ?? 0;
        var totalAllocated = _db.DonationAllocations.Sum(a => (decimal?)a.AmountAllocated) ?? 0;
        var unallocated    = (double)Math.Max(0m, totalMonetary - totalAllocated);

        // 12-month donation trend
        var donationTrend = _db.Donations
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
        var recentDonations = _db.Donations
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
                supporterName = _db.Supporters
                    .Where(s => s.SupporterId == d.SupporterId)
                    .Select(s => s.DisplayName)
                    .FirstOrDefault(),
                supporterEmail = _db.Supporters
                    .Where(s => s.SupporterId == d.SupporterId)
                    .Select(s => s.Email)
                    .FirstOrDefault(),
                totalAllocated = _db.DonationAllocations
                    .Where(a => a.DonationId == d.DonationId)
                    .Sum(a => (decimal?)a.AmountAllocated) ?? 0,
            })
            .ToList();

        // Volunteers & partners (non-monetary supporters)
        var volunteersPartners = _db.Supporters
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
                inKindTotal = _db.Donations
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

    // ── GET /Dashboard/DonorAllocations ──────────────────────────────────────

    /// <summary>
    /// Allocation summary: total received vs allocated vs unallocated gap,
    /// breakdown by program area, and dropdown options for the create-allocation form.
    /// </summary>
    [HttpGet("DonorAllocations")]
    public IActionResult GetDonorAllocations()
    {
        var totalMonetary  = _db.Donations.Where(d => d.Amount.HasValue).Sum(d => (decimal?)d.Amount) ?? 0;
        var totalAllocated = _db.DonationAllocations.Sum(a => (decimal?)a.AmountAllocated) ?? 0;
        var unallocated    = Math.Max(0m, totalMonetary - totalAllocated);

        var byProgramArea = _db.DonationAllocations
            .GroupBy(a => a.ProgramArea)
            .Select(g => new
            {
                programArea    = g.Key,
                totalAllocated = g.Sum(a => (decimal?)a.AmountAllocated) ?? 0,
            })
            .OrderByDescending(x => x.totalAllocated)
            .ToList();

        var safehouses = _db.Safehouses
            .Where(s => s.Status == "Active")
            .OrderBy(s => s.Name)
            .Select(s => new { s.SafehouseId, s.Name })
            .ToList();

        var existingAreas = _db.DonationAllocations
            .Select(a => a.ProgramArea)
            .Distinct()
            .ToList();

        var defaultAreas = new[] { "Education", "Healthcare", "Shelter", "Livelihood", "Operations", "Advocacy" };
        var programAreas = existingAreas
            .Union(defaultAreas)
            .OrderBy(p => p)
            .ToList();

        // Unallocated monetary donations (with remaining balance) for the form
        var unallocatedDonations = _db.Donations
            .Where(d => d.DonationType == "Monetary" && d.Amount.HasValue)
            .Select(d => new
            {
                d.DonationId,
                d.DonationDate,
                d.Amount,
                supporterName = _db.Supporters
                    .Where(s => s.SupporterId == d.SupporterId)
                    .Select(s => s.DisplayName)
                    .FirstOrDefault(),
                allocated = _db.DonationAllocations
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

    // ── POST /Dashboard/DonorAllocations ─────────────────────────────────────

    /// <summary>
    /// Create a new donation allocation.
    /// </summary>
    [HttpPost("DonorAllocations")]
    public IActionResult CreateAllocation([FromBody] DashboardAllocationRequest req)
    {
        if (req.AmountAllocated <= 0)
            return BadRequest("Amount must be greater than zero.");

        var donation = _db.Donations.Find(req.DonationId);
        if (donation is null) return NotFound("Donation not found.");
        if (donation.DonationType != "Monetary" || !donation.Amount.HasValue)
            return BadRequest("Only monetary donations can be allocated.");

        var alreadyAllocated = _db.DonationAllocations
            .Where(a => a.DonationId == req.DonationId)
            .Sum(a => (decimal?)a.AmountAllocated) ?? 0;

        var remaining = donation.Amount.Value - alreadyAllocated;
        if ((decimal)req.AmountAllocated > remaining)
            return BadRequest($"Exceeds remaining balance of {remaining:C}.");

        if (_db.Safehouses.Find(req.SafehouseId) is null)
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

        _db.DonationAllocations.Add(allocation);
        _db.SaveChanges();

        return StatusCode(201, new { allocation.AllocationId, message = "Allocation created." });
    }

    // ── GET /Dashboard/SocialMediaManager ────────────────────────────────────

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
        var actionQueue = _db.SocialMediaPosts
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
        var postsThisMonth = _db.SocialMediaPosts
            .Where(p => p.CreatedAt >= startOfMonth)
            .ToList();

        var avgEngagement      = postsThisMonth.Count > 0
            ? Math.Round(postsThisMonth.Average(p => (double)p.EngagementRate) * 100, 1)
            : 0.0;
        var referralsThisMonth = postsThisMonth.Sum(p => p.DonationReferrals);

        // 12-month engagement trend
        var engagementTrend = _db.SocialMediaPosts
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
        var referralTrend = _db.SocialMediaPosts
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
        var topPosts = _db.SocialMediaPosts
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
}

// ── DTO ────────────────────────────────────────────────────────────────────────

public class DashboardAllocationRequest
{
    public int DonationId { get; set; }
    public int SafehouseId { get; set; }
    public required string ProgramArea { get; set; }
    public double AmountAllocated { get; set; }
    public string? Notes { get; set; }
}
