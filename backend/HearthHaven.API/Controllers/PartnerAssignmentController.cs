using HearthHaven.API.Data;
using HearthHaven.API.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace HearthHaven.API.Controllers;

[Authorize(Roles = AppRoles.Admin + "," + AppRoles.OutreachManager + "," + AppRoles.CaseManager)]
[Route("[controller]")]
[ApiController]
public class PartnerAssignmentController : ControllerBase
{
    private readonly HearthHavenDbContext _context;

    public PartnerAssignmentController(HearthHavenDbContext context) => _context = context;

    [HttpGet("FilterOptions")]
    public IActionResult GetFilterOptions()
    {
        return Ok(new
        {
            programAreas = _context.PartnerAssignments
                .Select(pa => pa.ProgramArea).Distinct().OrderBy(s => s).ToList(),
            statuses = _context.PartnerAssignments
                .Select(pa => pa.Status).Distinct().OrderBy(s => s).ToList(),
        });
    }

    [HttpPost]
    [Authorize(Roles = AppRoles.Admin + "," + AppRoles.OutreachManager)]
    public IActionResult Create([FromBody] PartnerAssignment assignment)
    {
        assignment.Partner = null;
        assignment.Safehouse = null;

        _context.PartnerAssignments.Add(assignment);
        _context.SaveChanges();

        return CreatedAtAction(null, new { id = assignment.AssignmentId }, assignment);
    }

    [HttpPut("{id}")]
    [Authorize(Roles = AppRoles.Admin + "," + AppRoles.OutreachManager)]
    public IActionResult Update(int id, [FromBody] PartnerAssignment updated)
    {
        var assignment = _context.PartnerAssignments.Find(id);
        if (assignment == null) return NotFound();

        updated.Partner = null;
        updated.Safehouse = null;

        _context.Entry(assignment).CurrentValues.SetValues(updated);
        assignment.AssignmentId = id;
        _context.SaveChanges();

        return Ok(assignment);
    }

    [HttpDelete("{id}")]
    [Authorize(Roles = AppRoles.Admin + "," + AppRoles.OutreachManager)]
    public IActionResult Delete(int id)
    {
        var assignment = _context.PartnerAssignments.Find(id);
        if (assignment == null) return NotFound();

        _context.PartnerAssignments.Remove(assignment);
        _context.SaveChanges();

        return NoContent();
    }
}
