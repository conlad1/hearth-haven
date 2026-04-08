using HearthHaven.API.Data;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace HearthHaven.API.Controllers;

[Route("[controller]")]
[ApiController]
public class AdminDashboardController : ControllerBase
{
    private readonly HearthHavenDbContext _context;

    public AdminDashboardController(HearthHavenDbContext context) => _context = context;

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
