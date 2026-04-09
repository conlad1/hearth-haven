using HearthHaven.API.Data;
using HearthHaven.API.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace HearthHaven.API.Controllers;

[Authorize(Roles = AppRoles.Admin + "," + AppRoles.OutreachManager + "," + AppRoles.CaseManager)]
[Route("[controller]")]
[ApiController]
public class PartnerController : ControllerBase
{
    private readonly HearthHavenDbContext _context;

    public PartnerController(HearthHavenDbContext context) => _context = context;

    [HttpGet("All")]
    public IActionResult GetAll(
        int page = 1,
        int pageSize = 20,
        string? partnerType = null,
        string? roleType = null,
        string? status = null,
        string? region = null,
        string? search = null)
    {
        var query = _context.Partners.AsQueryable();

        if (!string.IsNullOrWhiteSpace(partnerType))
            query = query.Where(p => p.PartnerType == partnerType);

        if (!string.IsNullOrWhiteSpace(roleType))
            query = query.Where(p => p.RoleType == roleType);

        if (!string.IsNullOrWhiteSpace(status))
            query = query.Where(p => p.Status == status);

        if (!string.IsNullOrWhiteSpace(region))
            query = query.Where(p => p.Region == region);

        if (!string.IsNullOrWhiteSpace(search))
        {
            var term = search.ToLower();
            query = query.Where(p =>
                p.PartnerName.ToLower().Contains(term) ||
                (p.ContactName != null && p.ContactName.ToLower().Contains(term)) ||
                (p.Email != null && p.Email.ToLower().Contains(term)));
        }

        var totalCount = query.Count();

        var data = query
            .OrderBy(p => p.PartnerName)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToList();

        return Ok(new
        {
            data,
            totalCount,
            page,
            pageSize,
            totalPages = (int)Math.Ceiling(totalCount / (double)pageSize)
        });
    }

    [HttpGet("FilterOptions")]
    public IActionResult GetFilterOptions()
    {
        return Ok(new
        {
            partnerTypes = _context.Partners
                .Select(p => p.PartnerType).Distinct().OrderBy(s => s).ToList(),
            roleTypes = _context.Partners
                .Select(p => p.RoleType).Distinct().OrderBy(s => s).ToList(),
            statuses = _context.Partners
                .Select(p => p.Status).Distinct().OrderBy(s => s).ToList(),
            regions = _context.Partners
                .Where(p => p.Region != null)
                .Select(p => p.Region!).Distinct().OrderBy(s => s).ToList(),
        });
    }

    [HttpGet("{id}")]
    public IActionResult GetById(int id)
    {
        var partner = _context.Partners.Find(id);
        if (partner == null) return NotFound();
        return Ok(partner);
    }

    [HttpGet("{id}/Safehouses")]
    public IActionResult GetSafehouses(
        int id,
        int page = 1,
        int pageSize = 20,
        string? programArea = null,
        string? status = null)
    {
        var query = _context.PartnerAssignments
            .Include(pa => pa.Safehouse)
            .Where(pa => pa.PartnerId == id);

        if (!string.IsNullOrWhiteSpace(programArea))
            query = query.Where(pa => pa.ProgramArea == programArea);

        if (!string.IsNullOrWhiteSpace(status))
            query = query.Where(pa => pa.Status == status);

        var totalCount = query.Count();

        var data = query
            .OrderBy(pa => pa.AssignmentStart)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToList();

        return Ok(new
        {
            data,
            totalCount,
            page,
            pageSize,
            totalPages = (int)Math.Ceiling(totalCount / (double)pageSize)
        });
    }

    [HttpPost]
    [Authorize(Roles = AppRoles.Admin + "," + AppRoles.OutreachManager)]
    public IActionResult Create([FromBody] Partner partner)
    {
        _context.Partners.Add(partner);
        _context.SaveChanges();
        return CreatedAtAction(nameof(GetById), new { id = partner.PartnerId }, partner);
    }

    [HttpPut("{id}")]
    [Authorize(Roles = AppRoles.Admin + "," + AppRoles.OutreachManager)]
    public IActionResult Update(int id, [FromBody] Partner updated)
    {
        var partner = _context.Partners.Find(id);
        if (partner == null) return NotFound();

        _context.Entry(partner).CurrentValues.SetValues(updated);
        partner.PartnerId = id;
        _context.SaveChanges();

        return Ok(partner);
    }

    [HttpDelete("{id}")]
    [Authorize(Roles = AppRoles.Admin + "," + AppRoles.OutreachManager)]
    public IActionResult Delete(int id)
    {
        var partner = _context.Partners.Find(id);
        if (partner == null) return NotFound();

        _context.Partners.Remove(partner);
        _context.SaveChanges();

        return NoContent();
    }
}
