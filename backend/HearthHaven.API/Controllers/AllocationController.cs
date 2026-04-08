using Microsoft.AspNetCore.Mvc;
using HearthHaven.API.Data;
using HearthHaven.API.Models;

namespace HearthHaven.API.Controllers;

[Route("[controller]")]
[ApiController]
public class AllocationController : ControllerBase
{
    private readonly HearthHavenDbContext _db;

    public AllocationController(HearthHavenDbContext db) => _db = db;

    // ✅ GET /Allocation (WITH SEARCH)
    [HttpGet]
    public IActionResult GetAll(
        [FromQuery] int? donationId = null,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        [FromQuery] string? search = null,
        [FromQuery] string? programArea = null
    )
    {
        var query = _db.DonationAllocations
            .Join(_db.Donations,
                  a => a.DonationId,
                  d => d.DonationId,
                  (a, d) => new { a, d })
            .Join(_db.Safehouses,
                  x => x.a.SafehouseId,
                  s => s.SafehouseId,
                  (x, s) => new { x.a, x.d, s });

        if (donationId.HasValue)
            query = query.Where(x => x.a.DonationId == donationId.Value);

        if (!string.IsNullOrWhiteSpace(programArea))
            query = query.Where(x => x.a.ProgramArea == programArea);

        // 🔍 SEARCH LOGIC (THIS WAS MISSING)
        if (!string.IsNullOrEmpty(search))
        {
            search = search.ToLower();

            query = query.Where(x =>
                x.s.Name.ToLower().Contains(search) ||              // Safehouse
                x.a.ProgramArea.ToLower().Contains(search) ||       // Program Area
                x.d.DonationType.ToLower().Contains(search) ||      // Type
                x.a.AmountAllocated.ToString().Contains(search) ||  // Amount
                x.a.AllocationDate.ToString().Contains(search)      // Date
            );
        }

        var totalCount = query.Count();
        var totalPages = Math.Max(1, (int)Math.Ceiling(totalCount / (double)pageSize));

        var data = query
            .OrderByDescending(x => x.a.AllocationDate)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(x => new
            {
                allocationId    = x.a.AllocationId,
                donationId      = x.a.DonationId,
                donationType    = x.d.DonationType,
                donationAmount  = x.d.Amount,
                safeHouseId     = x.a.SafehouseId,
                safehouseName   = x.s.Name,
                programArea     = x.a.ProgramArea,
                amountAllocated = x.a.AmountAllocated,
                allocationDate  = x.a.AllocationDate.ToString("yyyy-MM-dd"),
                notes           = x.a.AllocationNotes,
            })
            .ToList();

        return Ok(new { data, totalCount, page, pageSize, totalPages });
    }

    // GET /Allocation/Safehouses
    [HttpGet("Safehouses")]
    public IActionResult GetSafehouses()
    {
        var safehouses = _db.Safehouses
            .Where(s => s.Status == "Active")
            .OrderBy(s => s.Name)
            .Select(s => new { s.SafehouseId, s.Name, s.City })
            .ToList();

        return Ok(safehouses);
    }

    // GET /Allocation/Donations
    [HttpGet("Donations")]
    public IActionResult GetDonations()
    {
        var donations = _db.Donations
            .Join(_db.Supporters,
                  d => d.SupporterId,
                  s => s.SupporterId,
                  (d, s) => new { d, s })
            .Where(x => x.d.DonationType == "Monetary" && x.d.Amount > 0)
            .OrderByDescending(x => x.d.DonationDate)
            .Select(x => new
            {
                donationId   = x.d.DonationId,
                label        = x.s.DisplayName + " — ₱" + x.d.Amount + " (" + x.d.DonationDate + ")",
                amount       = x.d.Amount,
            })
            .ToList();

        return Ok(donations);
    }

    // POST /Allocation
    [HttpPost]
    public async Task<IActionResult> Create([FromBody] AllocationRequest req)
    {
        if (req == null) return BadRequest("Invalid payload");

        var allocation = new DonationAllocation
        {
            DonationId       = req.donation_id,
            SafehouseId      = req.safehouse_id,
            ProgramArea      = req.program_area,
            AmountAllocated  = req.amount_allocated,
            AllocationDate   = DateOnly.FromDateTime(req.allocation_date),
            AllocationNotes  = req.notes,
        };

        try
        {
            _db.DonationAllocations.Add(allocation);
            await _db.SaveChangesAsync();
            return Ok(new { allocationId = allocation.AllocationId });
        }
        catch (Exception ex)
        {
            return StatusCode(500, ex.InnerException?.Message ?? ex.Message);
        }
    }

    // PUT /Allocation/{id}
    [HttpPut("{id:int}")]
    public async Task<IActionResult> Update(int id, [FromBody] AllocationRequest req)
    {
        var allocation = await _db.DonationAllocations.FindAsync(id);
        if (allocation == null) return NotFound($"Allocation {id} not found.");

        allocation.SafehouseId     = req.safehouse_id;
        allocation.ProgramArea     = req.program_area;
        allocation.AmountAllocated = req.amount_allocated;
        allocation.AllocationDate  = DateOnly.FromDateTime(req.allocation_date);
        allocation.AllocationNotes = req.notes;

        try
        {
            await _db.SaveChangesAsync();
            return Ok(new { message = "Updated." });
        }
        catch (Exception ex)
        {
            return StatusCode(500, ex.InnerException?.Message ?? ex.Message);
        }
    }

    // DELETE /Allocation/{id}
    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id)
    {
        var allocation = await _db.DonationAllocations.FindAsync(id);
        if (allocation == null) return NotFound($"Allocation {id} not found.");

        _db.DonationAllocations.Remove(allocation);
        await _db.SaveChangesAsync();
        return Ok(new { message = "Deleted." });
    }
}
