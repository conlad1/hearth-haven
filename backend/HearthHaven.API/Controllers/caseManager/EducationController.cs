using HearthHaven.API.Data;
using HearthHaven.API.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace HearthHaven.API.Controllers;

[Authorize(Roles = AppRoles.Admin + "," + AppRoles.CaseManager)]
[Route("[controller]")]
[ApiController]
public class EducationController : ControllerBase
{
    private readonly HearthHavenDbContext _context;

    public EducationController(HearthHavenDbContext context) => _context = context;

    [HttpGet("Resident/{residentId}")]
    public IActionResult GetByResident(
        int residentId,
        int page = 1,
        int pageSize = 10,
        string? dateFrom = null,
        string? dateTo = null,
        string? educationLevel = null,
        string? enrollmentStatus = null,
        string? completionStatus = null)
    {
        var query = _context.EducationRecords
            .Where(r => r.ResidentId == residentId);

        if (DateOnly.TryParse(dateFrom, out var from))
            query = query.Where(r => r.RecordDate >= from);
        if (DateOnly.TryParse(dateTo, out var to))
            query = query.Where(r => r.RecordDate <= to);
        if (!string.IsNullOrWhiteSpace(educationLevel))
            query = query.Where(r => r.EducationLevel == educationLevel);
        if (!string.IsNullOrWhiteSpace(enrollmentStatus))
            query = query.Where(r => r.EnrollmentStatus == enrollmentStatus);
        if (!string.IsNullOrWhiteSpace(completionStatus))
            query = query.Where(r => r.CompletionStatus == completionStatus);

        var totalCount = query.Count();
        var records = query
            .OrderByDescending(r => r.RecordDate)
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
        var records = _context.EducationRecords.Where(r => r.ResidentId == residentId);
        return Ok(new
        {
            educationLevels = records.Select(r => r.EducationLevel).Distinct().OrderBy(s => s).ToList(),
            enrollmentStatuses = records.Select(r => r.EnrollmentStatus).Distinct().OrderBy(s => s).ToList(),
            completionStatuses = records.Select(r => r.CompletionStatus).Distinct().OrderBy(s => s).ToList(),
        });
    }

    [HttpGet("GlobalFilterOptions")]
    public IActionResult GetGlobalFilterOptions()
    {
        var records = _context.EducationRecords.AsQueryable();
        return Ok(new
        {
            educationLevels = records.Select(r => r.EducationLevel).Distinct().OrderBy(s => s).ToList(),
            enrollmentStatuses = records.Select(r => r.EnrollmentStatus).Distinct().OrderBy(s => s).ToList(),
            completionStatuses = records.Select(r => r.CompletionStatus).Distinct().OrderBy(s => s).ToList(),
        });
    }

    [HttpGet("{id}")]
    public IActionResult Get(int id)
    {
        var record = _context.EducationRecords.Find(id);
        if (record == null) return NotFound();
        return Ok(record);
    }

    [HttpPost]
    public IActionResult Create([FromBody] EducationRecord record)
    {
        _context.EducationRecords.Add(record);
        _context.SaveChanges();
        return CreatedAtAction(nameof(Get), new { id = record.EducationRecordId }, record);
    }

    [HttpPut("{id}")]
    public IActionResult Update(int id, [FromBody] EducationRecord updated)
    {
        var record = _context.EducationRecords.Find(id);
        if (record == null) return NotFound();

        _context.Entry(record).CurrentValues.SetValues(updated);
        record.EducationRecordId = id;
        _context.SaveChanges();

        return Ok(record);
    }

    [HttpDelete("{id}")]
    public IActionResult Delete(int id)
    {
        var record = _context.EducationRecords.Find(id);
        if (record == null) return NotFound();

        _context.EducationRecords.Remove(record);
        _context.SaveChanges();

        return NoContent();
    }
}
