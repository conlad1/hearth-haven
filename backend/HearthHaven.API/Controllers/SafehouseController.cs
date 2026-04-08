using HearthHaven.API.Data;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace HearthHaven.API.Controllers;

[Route("[controller]")]
[ApiController]
public class SafehouseController : ControllerBase
{
    private readonly HearthHavenDbContext _context;

    public SafehouseController(HearthHavenDbContext context) => _context = context;

    [HttpGet("All")]
    public IActionResult GetAll(
        int page = 1,
        int pageSize = 20,
        string? region = null,
        string? status = null,
        string? search = null)
    {
        var query = _context.Safehouses.AsQueryable();

        if (!string.IsNullOrWhiteSpace(region))
            query = query.Where(s => s.Region == region);

        if (!string.IsNullOrWhiteSpace(status))
            query = query.Where(s => s.Status == status);

        if (!string.IsNullOrWhiteSpace(search))
        {
            var term = search.ToLower();
            query = query.Where(s =>
                s.Name.ToLower().Contains(term) ||
                s.SafehouseCode.ToLower().Contains(term) ||
                s.City.ToLower().Contains(term) ||
                s.Province.ToLower().Contains(term));
        }

        var totalCount = query.Count();

        var data = query
            .OrderBy(s => s.Name)
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
            regions = _context.Safehouses
                .Select(s => s.Region).Distinct().OrderBy(s => s).ToList(),
            statuses = _context.Safehouses
                .Select(s => s.Status).Distinct().OrderBy(s => s).ToList(),
        });
    }

    [HttpGet("{id}")]
    public IActionResult GetById(int id)
    {
        var safehouse = _context.Safehouses.Find(id);
        if (safehouse == null) return NotFound();
        return Ok(safehouse);
    }

    [HttpGet("{id}/Partners")]
    public IActionResult GetPartners(
        int id,
        int page = 1,
        int pageSize = 20,
        string? programArea = null,
        string? status = null)
    {
        var query = _context.PartnerAssignments
            .Include(pa => pa.Partner)
            .Where(pa => pa.SafehouseId == id);

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
    public IActionResult Create([FromBody] Safehouse safehouse)
    {
        _context.Safehouses.Add(safehouse);
        _context.SaveChanges();
        return CreatedAtAction(nameof(GetById), new { id = safehouse.SafehouseId }, safehouse);
    }

    [HttpPut("{id}")]
    public IActionResult Update(int id, [FromBody] Safehouse updated)
    {
        var safehouse = _context.Safehouses.Find(id);
        if (safehouse == null) return NotFound();

        _context.Entry(safehouse).CurrentValues.SetValues(updated);
        safehouse.SafehouseId = id;
        _context.SaveChanges();

        return Ok(safehouse);
    }

    [HttpDelete("{id}")]
    public IActionResult Delete(int id)
    {
        var safehouse = _context.Safehouses.Find(id);
        if (safehouse == null) return NotFound();

        _context.Safehouses.Remove(safehouse);
        _context.SaveChanges();

        return NoContent();
    }
}
