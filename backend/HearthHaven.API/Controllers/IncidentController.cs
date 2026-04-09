using HearthHaven.API.Data;
using HearthHaven.API.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace HearthHaven.API.Controllers;

[Authorize(Roles = AppRoles.Admin + "," + AppRoles.CaseManager)]
[Route("[controller]")]
[ApiController]
public class IncidentController : ControllerBase
{
    private readonly HearthHavenDbContext _context;

    public IncidentController(HearthHavenDbContext context) => _context = context;

    [HttpGet("Resident/{residentId}")]
    public IActionResult GetByResident(
        int residentId,
        int page = 1,
        int pageSize = 10,
        string? dateFrom = null,
        string? dateTo = null,
        string? incidentType = null,
        string? severity = null,
        bool? resolved = null)
    {
        var query = _context.IncidentReports
            .Where(r => r.ResidentId == residentId);

        if (DateOnly.TryParse(dateFrom, out var from))
            query = query.Where(r => r.IncidentDate >= from);
        if (DateOnly.TryParse(dateTo, out var to))
            query = query.Where(r => r.IncidentDate <= to);
        if (!string.IsNullOrWhiteSpace(incidentType))
            query = query.Where(r => r.IncidentType == incidentType);
        if (!string.IsNullOrWhiteSpace(severity))
            query = query.Where(r => r.Severity == severity);
        if (resolved.HasValue)
            query = query.Where(r => r.Resolved == resolved.Value);

        var totalCount = query.Count();
        var records = query
            .OrderByDescending(r => r.IncidentDate)
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
        var records = _context.IncidentReports.Where(r => r.ResidentId == residentId);
        return Ok(new
        {
            incidentTypes = records.Select(r => r.IncidentType).Distinct().OrderBy(s => s).ToList(),
            severities = records.Select(r => r.Severity).Distinct().OrderBy(s => s).ToList(),
        });
    }

    [HttpGet("GlobalFilterOptions")]
    public IActionResult GetGlobalFilterOptions()
    {
        var records = _context.IncidentReports.AsQueryable();
        return Ok(new
        {
            incidentTypes = records.Select(r => r.IncidentType).Distinct().OrderBy(s => s).ToList(),
            severities = records.Select(r => r.Severity).Distinct().OrderBy(s => s).ToList(),
        });
    }

    [HttpGet("{id}")]
    public IActionResult Get(int id)
    {
        var record = _context.IncidentReports.Find(id);
        if (record == null) return NotFound();
        return Ok(record);
    }

    [HttpPost]
    public IActionResult Create([FromBody] IncidentReport record)
    {
        _context.IncidentReports.Add(record);
        _context.SaveChanges();
        return CreatedAtAction(nameof(Get), new { id = record.IncidentId }, record);
    }

    [HttpPut("{id}")]
    public IActionResult Update(int id, [FromBody] IncidentReport updated)
    {
        var record = _context.IncidentReports.Find(id);
        if (record == null) return NotFound();

        _context.Entry(record).CurrentValues.SetValues(updated);
        record.IncidentId = id;
        _context.SaveChanges();

        return Ok(record);
    }

    [HttpDelete("{id}")]
    public IActionResult Delete(int id)
    {
        var record = _context.IncidentReports.Find(id);
        if (record == null) return NotFound();

        _context.IncidentReports.Remove(record);
        _context.SaveChanges();

        return NoContent();
    }
}
