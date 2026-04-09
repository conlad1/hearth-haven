using HearthHaven.API.Data;
using HearthHaven.API.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace HearthHaven.API.Controllers;

[Authorize(Roles = AppRoles.Admin + "," + AppRoles.CaseManager)]
[Route("[controller]")]
[ApiController]
public class HealthWellbeingController : ControllerBase
{
    private readonly HearthHavenDbContext _context;

    public HealthWellbeingController(HearthHavenDbContext context) => _context = context;

    [HttpGet("Resident/{residentId}")]
    public IActionResult GetByResident(
        int residentId,
        int page = 1,
        int pageSize = 10,
        string? dateFrom = null,
        string? dateTo = null,
        bool? medicalCheckupDone = null,
        bool? dentalCheckupDone = null,
        bool? psychologicalCheckupDone = null)
    {
        var query = _context.HealthWellbeingRecords
            .Where(r => r.ResidentId == residentId);

        if (DateOnly.TryParse(dateFrom, out var from))
            query = query.Where(r => r.RecordDate >= from);
        if (DateOnly.TryParse(dateTo, out var to))
            query = query.Where(r => r.RecordDate <= to);
        if (medicalCheckupDone.HasValue)
            query = query.Where(r => r.MedicalCheckupDone == medicalCheckupDone.Value);
        if (dentalCheckupDone.HasValue)
            query = query.Where(r => r.DentalCheckupDone == dentalCheckupDone.Value);
        if (psychologicalCheckupDone.HasValue)
            query = query.Where(r => r.PsychologicalCheckupDone == psychologicalCheckupDone.Value);

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

    [HttpGet("{id}")]
    public IActionResult Get(int id)
    {
        var record = _context.HealthWellbeingRecords.Find(id);
        if (record == null) return NotFound();
        return Ok(record);
    }

    [HttpPost]
    public IActionResult Create([FromBody] HealthWellbeingRecord record)
    {
        _context.HealthWellbeingRecords.Add(record);
        _context.SaveChanges();
        return CreatedAtAction(nameof(Get), new { id = record.HealthRecordId }, record);
    }

    [HttpPut("{id}")]
    public IActionResult Update(int id, [FromBody] HealthWellbeingRecord updated)
    {
        var record = _context.HealthWellbeingRecords.Find(id);
        if (record == null) return NotFound();

        _context.Entry(record).CurrentValues.SetValues(updated);
        record.HealthRecordId = id;
        _context.SaveChanges();

        return Ok(record);
    }

    [HttpDelete("{id}")]
    public IActionResult Delete(int id)
    {
        var record = _context.HealthWellbeingRecords.Find(id);
        if (record == null) return NotFound();

        _context.HealthWellbeingRecords.Remove(record);
        _context.SaveChanges();

        return NoContent();
    }
}
