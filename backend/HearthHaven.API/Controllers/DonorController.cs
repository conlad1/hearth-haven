using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using HearthHaven.API.Data;

namespace HearthHaven.API.Controllers;

[Route("[controller]")]
[ApiController]
public class DonorController : ControllerBase
{
    private readonly HearthHavenDbContext _db;

    public DonorController(HearthHavenDbContext db) => _db = db;

    // GET /Donor/FilterOptions
    [HttpGet("FilterOptions")]
    public IActionResult GetFilterOptions()
    {
        var supporterTypes = _db.Supporters
            .Select(s => s.SupporterType)
            .Distinct()
            .OrderBy(t => t)
            .ToList();

        var donationTypes = _db.Donations
            .Select(d => d.DonationType)
            .Distinct()
            .OrderBy(t => t)
            .ToList();

        return Ok(new
        {
            supporterTypes,
            statuses = new[] { "Active", "Inactive" },
            donationTypes,
            channelSources = new[] { "Card", "PayPal", "Bank Transfer", "Cash", "Direct" },
            programAreas = Array.Empty<string>(),
            safehouseAllocations = Array.Empty<string>(),
            contributionStatuses = new[] { "Confirmed" },
        });
    }

    // GET /Donor/Supporters
    [HttpGet("Supporters")]
    public IActionResult GetSupporters(
        int page = 1,
        int pageSize = 20,
        string? supporterType = null,
        int? supporterId = null,
        string? status = null,
        string? search = null)
    {
        var query = _db.Supporters.AsQueryable();

        if (supporterId.HasValue)
            query = query.Where(s => s.SupporterId == supporterId.Value);
        else if (!string.IsNullOrWhiteSpace(supporterType))
            query = query.Where(s => s.SupporterType == supporterType);

        if (!string.IsNullOrWhiteSpace(status))
            query = query.Where(s => s.Status == status);

        if (!string.IsNullOrWhiteSpace(search))
        {
            query = query.Where(s =>
                (s.FirstName != null && s.FirstName.Contains(search)) ||
                (s.LastName != null && s.LastName.Contains(search)) ||
                (s.Email != null && s.Email.Contains(search)) ||
                (s.OrganizationName != null && s.OrganizationName.Contains(search)) ||
                s.DisplayName.Contains(search));
        }

        var totalCount = query.Count();
        var totalPages = Math.Max(1, (int)Math.Ceiling(totalCount / (double)pageSize));

        var supporters = query
            .OrderByDescending(s => s.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(s => new
            {
                supporterId = s.SupporterId,
                supporterType = s.SupporterType,
                status = s.Status,
                firstName = s.FirstName ?? "",
                lastName = s.LastName ?? "",
                email = s.Email ?? "",
                phone = s.Phone,
                organizationName = s.OrganizationName,
                address = (string?)null,
                notes = (string?)null,
                createdAt = s.CreatedAt.ToString("o"),
            })
            .ToList();

        return Ok(new
        {
            data = supporters,
            totalCount,
            page,
            pageSize,
            totalPages,
        });
    }

    // GET /Donor/Contributions
    [HttpGet("Contributions")]
    public IActionResult GetContributions(
        int page = 1,
        int pageSize = 20,
        string? donationType = null,
        string? status = null,
        string? programArea = null,
        string? safehouseAllocation = null,
        int? supporterId = null,
        string? search = null)
    {
        var query = _db.Donations.Include(d => d.Supporter).AsQueryable();

        if (!string.IsNullOrWhiteSpace(donationType))
            query = query.Where(d => d.DonationType == donationType);

        if (supporterId.HasValue)
            query = query.Where(d => d.SupporterId == supporterId.Value);

        if (!string.IsNullOrWhiteSpace(search))
        {
            query = query.Where(d =>
                (d.Supporter != null && d.Supporter.DisplayName.Contains(search)) ||
                d.DonationType.Contains(search) ||
                (d.Notes != null && d.Notes.Contains(search)));
        }

        var totalCount = query.Count();
        var totalPages = Math.Max(1, (int)Math.Ceiling(totalCount / (double)pageSize));

        var donations = query
            .OrderByDescending(d => d.DonationDate)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(d => new
            {
                donationId = d.DonationId,
                supporterId = d.SupporterId,
                supporterName = d.Supporter != null ? d.Supporter.DisplayName : "Unknown",
                donationType = d.DonationType,
                amount = d.Amount,
                currencyCode = d.CurrencyCode ?? "USD",
                isRecurring = d.IsRecurring,
                frequency = (string?)null,
                channelSource = d.ChannelSource,
                description = (string?)null,
                estimatedValue = d.EstimatedValue,
                donationDate = d.DonationDate.ToString("yyyy-MM-dd"),
                safehouseAllocation = (string?)null,
                programArea = (string?)null,
                status = "Confirmed",
                notes = d.Notes,
                createdAt = d.DonationDate.ToString("yyyy-MM-dd"),
            })
            .ToList();

        return Ok(new
        {
            data = donations,
            totalCount,
            page,
            pageSize,
            totalPages,
        });
    }
}
