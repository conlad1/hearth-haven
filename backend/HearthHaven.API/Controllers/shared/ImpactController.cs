using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using HearthHaven.API.Data;

namespace HearthHaven.API.Controllers;

[Route("[controller]")]
[ApiController]
public class ImpactController : ControllerBase
{
    private readonly HearthHavenDbContext _db;
    public ImpactController(HearthHavenDbContext db) => _db = db;

    // GET /Impact/Stats  — public, no auth required
    [HttpGet("Stats")]
    public IActionResult GetStats()
    {
        var totalDonations      = _db.Donations.Count();
        var totalMonetary       = _db.Donations
                                     .Where(d => d.DonationType == "Monetary" && d.Amount != null)
                                     .Sum(d => (decimal?)d.Amount) ?? 0;
        var totalDonors         = _db.Supporters
                                     .Where(s => s.SupporterType != "Anonymous")
                                     .Count();
        var activeSafehouses    = _db.Safehouses.Count(s => s.Status == "Active");
        var totalResidents      = _db.Residents.Count();
        var activeResidents     = _db.Residents.Count(r => r.CaseStatus == "Active");
        var totalAllocated      = _db.DonationAllocations.Sum(a => (decimal?)a.AmountAllocated) ?? 0;

        var byProgramArea = _db.DonationAllocations
            .GroupBy(a => a.ProgramArea)
            .Select(g => new { area = g.Key, amount = g.Sum(a => a.AmountAllocated) })
            .OrderByDescending(x => x.amount)
            .ToList();

        var byDonationType = _db.Donations
            .GroupBy(d => d.DonationType)
            .Select(g => new { type = g.Key, count = g.Count() })
            .ToList();

        var completedReintegrations = _db.Residents
            .Count(r => r.ReintegrationStatus == "Completed");

        var totalCounselingSessions = _db.ProcessRecordings.Count();

        var earliestOpenYear = _db.Safehouses
            .Min(s => (int?)s.OpenDate.Year);
        var yearsOfOperation = earliestOpenYear.HasValue
            ? DateTime.UtcNow.Year - earliestOpenYear.Value
            : 0;

        return Ok(new
        {
            totalDonations,
            totalMonetary,
            totalDonors,
            activeSafehouses,
            totalResidents,
            activeResidents,
            totalAllocated,
            byProgramArea,
            byDonationType,
            completedReintegrations,
            totalCounselingSessions,
            yearsOfOperation,
        });
    }

    // GET /Impact/OutcomeStats  — public, no auth required
    [HttpGet("OutcomeStats")]
    public IActionResult GetOutcomeStats()
    {
        var threeMonthsAgo = DateOnly.FromDateTime(DateTime.UtcNow.AddMonths(-3));

        var allResidentIds = _db.Residents
            .Select(r => r.ResidentId)
            .ToList();

        var totalResidents = allResidentIds.Count;

        if (totalResidents == 0)
            return Ok(new { educationEngagementRate = 0.0, healthImprovementRate = 0.0, safetyRate = 0.0 });

        // Education engagement: residents with at least one Enrolled record in the last 3 months
        var enrolledResidentIds = _db.EducationRecords
            .Where(e => e.EnrollmentStatus == "Enrolled" && e.RecordDate >= threeMonthsAgo)
            .Select(e => e.ResidentId)
            .Distinct()
            .ToHashSet();

        var educationEngagementRate = Math.Round((double)enrolledResidentIds.Count / totalResidents * 100, 1);

        // Health improvement: residents whose most recent general_health_score > their first
        var healthScores = _db.HealthWellbeingRecords
            .Where(h => h.GeneralHealthScore != null)
            .GroupBy(h => h.ResidentId)
            .Select(g => new
            {
                ResidentId = g.Key,
                First = g.OrderBy(h => h.RecordDate).First().GeneralHealthScore,
                Latest = g.OrderByDescending(h => h.RecordDate).First().GeneralHealthScore,
            })
            .ToList();

        var improvedCount = healthScores.Count(h => h.Latest > h.First);
        // Only count residents who have health records
        var healthImprovementRate = healthScores.Count > 0
            ? Math.Round((double)improvedCount / healthScores.Count * 100, 1)
            : 0.0;

        // Safety rate: residents with zero incident reports during their stay
        var residentsWithIncidents = _db.IncidentReports
            .Select(i => i.ResidentId)
            .Distinct()
            .ToHashSet();

        var safeResidentCount = allResidentIds.Count(id => !residentsWithIncidents.Contains(id));
        var safetyRate = Math.Round((double)safeResidentCount / totalResidents * 100, 1);

        return Ok(new
        {
            educationEngagementRate,
            healthImprovementRate,
            safetyRate,
        });
    }
}
