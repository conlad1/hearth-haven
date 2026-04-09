using HearthHaven.API.Data;
using HearthHaven.API.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace HearthHaven.API.Controllers;

[Authorize(Roles = AppRoles.Admin + "," + AppRoles.CaseManager)]
[Route("[controller]")]
[ApiController]
public class InterventionPlanController : ControllerBase
{
    private readonly HearthHavenDbContext _context;

    public InterventionPlanController(HearthHavenDbContext context) => _context = context;

    [HttpGet("Resident/{residentId}")]
    public IActionResult GetByResident(int residentId, string? planCategory = null)
    {
        var query = _context.InterventionPlans
            .Where(r => r.ResidentId == residentId);

        if (!string.IsNullOrWhiteSpace(planCategory))
            query = query.Where(r => r.PlanCategory == planCategory);

        var records = query
            .OrderByDescending(r => r.TargetDate)
            .ToList();

        return Ok(records);
    }

    [HttpGet("{id}")]
    public IActionResult Get(int id)
    {
        var record = _context.InterventionPlans.Find(id);
        if (record == null) return NotFound();
        return Ok(record);
    }

    [HttpPost]
    public IActionResult Create([FromBody] InterventionPlan record)
    {
        record.Resident = null;
        record.CreatedAt = DateTime.UtcNow;
        record.UpdatedAt = DateTime.UtcNow;
        _context.InterventionPlans.Add(record);
        _context.SaveChanges();
        return CreatedAtAction(nameof(Get), new { id = record.PlanId }, record);
    }

    [HttpPut("{id}")]
    public IActionResult Update(int id, [FromBody] InterventionPlan updated)
    {
        var record = _context.InterventionPlans.Find(id);
        if (record == null) return NotFound();

        _context.Entry(record).CurrentValues.SetValues(updated);
        record.PlanId = id;
        record.UpdatedAt = DateTime.UtcNow;
        _context.SaveChanges();

        return Ok(record);
    }

    [HttpDelete("{id}")]
    public IActionResult Delete(int id)
    {
        var record = _context.InterventionPlans.Find(id);
        if (record == null) return NotFound();

        _context.InterventionPlans.Remove(record);
        _context.SaveChanges();

        return NoContent();
    }
}
