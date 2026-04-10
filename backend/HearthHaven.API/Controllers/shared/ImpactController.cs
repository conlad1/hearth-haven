using Microsoft.AspNetCore.Mvc;
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
        });
    }
}
