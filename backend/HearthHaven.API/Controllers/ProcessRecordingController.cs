using HearthHaven.API.Data;
using HearthHaven.API.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace HearthHaven.API.Controllers;

[Authorize(Roles = AppRoles.Admin + "," + AppRoles.CaseManager)]
[Route("[controller]")]
[ApiController]
public class ProcessRecordingController : ControllerBase
{
    private readonly HearthHavenDbContext _context;

    public ProcessRecordingController(HearthHavenDbContext context) => _context = context;

    [HttpGet("Resident/{residentId}")]
    public IActionResult GetByResident(
        int residentId,
        int page = 1,
        int pageSize = 10,
        string? dateFrom = null,
        string? dateTo = null,
        string? sessionType = null,
        string? socialWorker = null,
        bool? concernsFlagged = null)
    {
        var query = _context.ProcessRecordings
            .Where(r => r.ResidentId == residentId);

        if (DateOnly.TryParse(dateFrom, out var from))
            query = query.Where(r => r.SessionDate >= from);
        if (DateOnly.TryParse(dateTo, out var to))
            query = query.Where(r => r.SessionDate <= to);
        if (!string.IsNullOrWhiteSpace(sessionType))
            query = query.Where(r => r.SessionType == sessionType);
        if (!string.IsNullOrWhiteSpace(socialWorker))
            query = query.Where(r => r.SocialWorker == socialWorker);
        if (concernsFlagged.HasValue)
            query = query.Where(r => r.ConcernsFlagged == concernsFlagged.Value);

        var totalCount = query.Count();
        var records = query
            .OrderByDescending(r => r.SessionDate)
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
        var records = _context.ProcessRecordings.Where(r => r.ResidentId == residentId);
        return Ok(new
        {
            sessionTypes = records.Select(r => r.SessionType).Distinct().OrderBy(s => s).ToList(),
            socialWorkers = records.Select(r => r.SocialWorker).Distinct().OrderBy(s => s).ToList(),
        });
    }

    [HttpGet("GlobalFilterOptions")]
    public IActionResult GetGlobalFilterOptions()
    {
        var records = _context.ProcessRecordings.AsQueryable();
        return Ok(new
        {
            sessionTypes = records.Select(r => r.SessionType).Distinct().OrderBy(s => s).ToList(),
            emotionalStates = records.Select(r => r.EmotionalStateObserved)
                .Union(records.Select(r => r.EmotionalStateEnd))
                .Distinct().OrderBy(s => s).ToList(),
            socialWorkers = records.Select(r => r.SocialWorker).Distinct().OrderBy(s => s).ToList(),
        });
    }

    [HttpGet("{id}")]
    public IActionResult Get(int id)
    {
        var record = _context.ProcessRecordings.Find(id);
        if (record == null) return NotFound();
        return Ok(record);
    }

    [HttpPost]
    public IActionResult Create([FromBody] ProcessRecording record)
    {
        _context.ProcessRecordings.Add(record);
        _context.SaveChanges();
        return CreatedAtAction(nameof(Get), new { id = record.RecordingId }, record);
    }

    [HttpPut("{id}")]
    public IActionResult Update(int id, [FromBody] ProcessRecording updated)
    {
        var record = _context.ProcessRecordings.Find(id);
        if (record == null) return NotFound();

        _context.Entry(record).CurrentValues.SetValues(updated);
        record.RecordingId = id;
        _context.SaveChanges();

        return Ok(record);
    }

    [HttpDelete("{id}")]
    public IActionResult Delete(int id)
    {
        var record = _context.ProcessRecordings.Find(id);
        if (record == null) return NotFound();

        _context.ProcessRecordings.Remove(record);
        _context.SaveChanges();

        return NoContent();
    }
}
