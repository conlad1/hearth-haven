using HearthHaven.API.Data;
using HearthHaven.API.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace HearthHaven.API.Controllers;

[Authorize(Roles = AppRoles.Admin + "," + AppRoles.CaseManager)]
[Route("[controller]")]
[ApiController]
public class VisitationController : ControllerBase
{
    private readonly HearthHavenDbContext _context;

    public VisitationController(HearthHavenDbContext context) => _context = context;

    [HttpGet("Resident/{residentId}")]
    public IActionResult GetByResident(
        int residentId,
        int page = 1,
        int pageSize = 10,
        string? dateFrom = null,
        string? dateTo = null,
        string? visitType = null,
        string? familyCooperationLevel = null,
        string? socialWorker = null,
        bool? safetyConcernsNoted = null)
    {
        var query = _context.HomeVisitations
            .Where(r => r.ResidentId == residentId);

        if (DateOnly.TryParse(dateFrom, out var from))
            query = query.Where(r => r.VisitDate >= from);
        if (DateOnly.TryParse(dateTo, out var to))
            query = query.Where(r => r.VisitDate <= to);
        if (!string.IsNullOrWhiteSpace(visitType))
            query = query.Where(r => r.VisitType == visitType);
        if (!string.IsNullOrWhiteSpace(familyCooperationLevel))
            query = query.Where(r => r.FamilyCooperationLevel == familyCooperationLevel);
        if (!string.IsNullOrWhiteSpace(socialWorker))
            query = query.Where(r => r.SocialWorker == socialWorker);
        if (safetyConcernsNoted.HasValue)
            query = query.Where(r => r.SafetyConcernsNoted == safetyConcernsNoted.Value);

        var totalCount = query.Count();
        var records = query
            .OrderByDescending(r => r.VisitDate)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToList();

        return Ok(new
        {
            data = records,
            totalCount,
            page,
            pageSize,
            totalPages = (int)Math.Ceiling(totalCount / (double)pageSize)
        });
    }

    [HttpGet("Resident/{residentId}/FilterOptions")]
    public IActionResult GetFilterOptions(int residentId)
    {
        var records = _context.HomeVisitations.Where(r => r.ResidentId == residentId);
        return Ok(new
        {
            visitTypes = records.Select(r => r.VisitType).Distinct().OrderBy(s => s).ToList(),
            cooperationLevels = records.Select(r => r.FamilyCooperationLevel).Distinct().OrderBy(s => s).ToList(),
            socialWorkers = records.Select(r => r.SocialWorker).Distinct().OrderBy(s => s).ToList(),
        });
    }

    [HttpGet("GlobalFilterOptions")]
    public IActionResult GetGlobalFilterOptions()
    {
        var records = _context.HomeVisitations.AsQueryable();
        return Ok(new
        {
            visitTypes = records.Select(r => r.VisitType).Distinct().OrderBy(s => s).ToList(),
            cooperationLevels = records.Select(r => r.FamilyCooperationLevel).Distinct().OrderBy(s => s).ToList(),
            visitOutcomes = records.Select(r => r.VisitOutcome).Distinct().OrderBy(s => s).ToList(),
            socialWorkers = records.Select(r => r.SocialWorker).Distinct().OrderBy(s => s).ToList(),
        });
    }

    [HttpGet("{id}")]
    public IActionResult Get(int id)
    {
        var record = _context.HomeVisitations.Find(id);
        if (record == null) return NotFound();
        return Ok(record);
    }

    [HttpPost]
    public IActionResult Create([FromBody] HomeVisitation record)
    {
        _context.HomeVisitations.Add(record);
        _context.SaveChanges();
        return CreatedAtAction(nameof(Get), new { id = record.VisitationId }, record);
    }

    [HttpPut("{id}")]
    public IActionResult Update(int id, [FromBody] HomeVisitation updated)
    {
        var record = _context.HomeVisitations.Find(id);
        if (record == null) return NotFound();

        _context.Entry(record).CurrentValues.SetValues(updated);
        record.VisitationId = id;
        _context.SaveChanges();

        return Ok(record);
    }

    [HttpDelete("{id}")]
    public IActionResult Delete(int id)
    {
        var record = _context.HomeVisitations.Find(id);
        if (record == null) return NotFound();

        _context.HomeVisitations.Remove(record);
        _context.SaveChanges();

        return NoContent();
    }
}
