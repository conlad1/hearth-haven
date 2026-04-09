using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using HearthHaven.API.Data;
using HearthHaven.API.Models;
using System.Globalization;
using Microsoft.AspNetCore.Authorization;

namespace HearthHaven.API.Controllers;

[Authorize]
[Route("[controller]")]
[ApiController]
public class DonorController : ControllerBase
{
    private readonly HearthHavenDbContext _db;
    private const int AnonymousSupporterId = 62;

    public DonorController(HearthHavenDbContext db) => _db = db;

    public sealed class SupporterPayload
    {
        public string? supporterType { get; set; }
        public string? status { get; set; }
        public string? firstName { get; set; }
        public string? lastName { get; set; }
        public string? email { get; set; }
        public string? phone { get; set; }
        public string? organizationName { get; set; }
    }

    public sealed class ContributionPayload
    {
        public int supporterId { get; set; }
        public string? donationType { get; set; }
        public decimal? amount { get; set; }
        public string? currencyCode { get; set; }
        public bool isRecurring { get; set; }
        public string? channelSource { get; set; }
        public decimal? estimatedValue { get; set; }
        public string? donationDate { get; set; }
        public string? notes { get; set; }
    }

    private static string BuildDisplayName(Supporter supporter)
    {
        if (!string.IsNullOrWhiteSpace(supporter.OrganizationName))
            return supporter.OrganizationName;

        var fullName = $"{supporter.FirstName} {supporter.LastName}".Trim();
        if (!string.IsNullOrWhiteSpace(fullName))
            return fullName;

        if (!string.IsNullOrWhiteSpace(supporter.Email))
            return supporter.Email;

        return supporter.SupporterType;
    }

    private object MapSupporter(Supporter s) => new
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
    };

    private object MapContribution(Donation d, string? safehouseAllocation = null, string? programArea = null) => new
    {
        donationId = d.DonationId,
        supporterId = d.SupporterId,
        supporterName = d.Supporter != null ? d.Supporter.DisplayName : "Unknown",
        donationType = d.DonationType,
        amount = d.Amount,
        currencyCode = d.CurrencyCode ?? "USD",
        isRecurring = d.IsRecurring,
        frequency = d.IsRecurring ? "Monthly" : "Once",
        channelSource = d.ChannelSource,
        description = d.Notes,
        estimatedValue = d.EstimatedValue,
        donationDate = d.DonationDate.ToString("yyyy-MM-dd"),
        safehouseAllocation,
        programArea,
        status = "Confirmed",
        notes = d.Notes,
        createdAt = d.DonationDate.ToString("yyyy-MM-dd"),
    };

    private static string FallbackDisplayName(string? email)
    {
        if (string.IsNullOrWhiteSpace(email))
            return "Supporter";

        var localPart = email.Split('@')[0].Trim();
        if (string.IsNullOrWhiteSpace(localPart))
            return "Supporter";

        var cleaned = localPart.Replace('.', ' ').Replace('_', ' ').Replace('-', ' ').Trim();
        return string.IsNullOrWhiteSpace(cleaned) ? "Supporter" : CultureInfo.InvariantCulture.TextInfo.ToTitleCase(cleaned);
    }

    private void DeleteDonationGraph(int donationId)
    {
        var allocations = _db.DonationAllocations.Where(a => a.DonationId == donationId).ToList();
        if (allocations.Count > 0)
            _db.DonationAllocations.RemoveRange(allocations);

        var inKindItems = _db.InKindDonationItems.Where(i => i.DonationId == donationId).ToList();
        if (inKindItems.Count > 0)
            _db.InKindDonationItems.RemoveRange(inKindItems);

        var donation = _db.Donations.FirstOrDefault(d => d.DonationId == donationId);
        if (donation != null)
            _db.Donations.Remove(donation);
    }

    private static decimal DonationValue(Donation donation) => donation.Amount ?? donation.EstimatedValue ?? 0m;

    // GET /Donor/FilterOptions
    [HttpGet("FilterOptions")]
    [Authorize(Roles = AppRoles.Admin + "," + AppRoles.DonationsManager)]
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

        var programAreas = _db.DonationAllocations
            .Select(a => a.ProgramArea)
            .Distinct()
            .OrderBy(a => a)
            .ToList();

        var safehouseAllocations = _db.DonationAllocations
            .Join(_db.Safehouses,
                a => a.SafehouseId,
                s => s.SafehouseId,
                (a, s) => s.Name)
            .Distinct()
            .OrderBy(n => n)
            .ToList();

        return Ok(new
        {
            supporterTypes,
            statuses = new[] { "Active", "Inactive" },
            donationTypes,
            channelSources = new[] { "Card", "PayPal", "Bank Transfer", "Cash", "Direct" },
            programAreas,
            safehouseAllocations,
            contributionStatuses = new[] { "Confirmed" },
        });
    }

    // GET /Donor/Analytics
    [HttpGet("Analytics")]
    [Authorize(Roles = AppRoles.Admin + "," + AppRoles.DonationsManager)]
    public IActionResult GetAnalytics()
    {
        var supporters = _db.Supporters.AsNoTracking().ToList();
        var donations = _db.Donations
            .Include(d => d.Supporter)
            .AsNoTracking()
            .ToList();

        var totalDonationValue = donations.Sum(DonationValue);

        var donationsOverTime = donations
            .GroupBy(d => new { d.DonationDate.Year, d.DonationDate.Month })
            .OrderBy(g => g.Key.Year)
            .ThenBy(g => g.Key.Month)
            .Select(g => new
            {
                period = $"{g.Key.Year}-{g.Key.Month:00}",
                label = new DateTime(g.Key.Year, g.Key.Month, 1).ToString("MMM yyyy", CultureInfo.InvariantCulture),
                totalAmount = g.Sum(DonationValue),
                donationCount = g.Count(),
                supporterCount = g.Select(d => d.SupporterId).Distinct().Count(),
            })
            .ToList();

        var donationTypeBreakdown = donations
            .GroupBy(d => d.DonationType)
            .OrderByDescending(g => g.Sum(DonationValue))
            .ThenBy(g => g.Key)
            .Select(g => new
            {
                donationType = g.Key,
                totalAmount = g.Sum(DonationValue),
                donationCount = g.Count(),
                supporterCount = g.Select(d => d.SupporterId).Distinct().Count(),
            })
            .ToList();

        var topCampaigns = donations
            .Where(d => !string.IsNullOrWhiteSpace(d.CampaignName))
            .GroupBy(d => d.CampaignName!.Trim())
            .OrderByDescending(g => g.Sum(DonationValue))
            .ThenByDescending(g => g.Count())
            .ThenBy(g => g.Key)
            .Take(5)
            .Select(g => new
            {
                campaignName = g.Key,
                totalAmount = g.Sum(DonationValue),
                donationCount = g.Count(),
                supporterCount = g.Select(d => d.SupporterId).Distinct().Count(),
            })
            .ToList();

        var supporterTypeBreakdown = supporters
            .GroupBy(s => s.SupporterType)
            .OrderByDescending(g => g.Count())
            .ThenBy(g => g.Key)
            .Select(g => new
            {
                supporterType = g.Key,
                supporterCount = g.Count(),
                activeCount = g.Count(s => s.Status == "Active"),
            })
            .ToList();

        return Ok(new
        {
            summary = new
            {
                totalSupporters = supporters.Count,
                activeSupporters = supporters.Count(s => s.Status == "Active"),
                totalDonations = donations.Count,
                totalDonationValue,
            },
            donationsOverTime,
            donationTypeBreakdown,
            topCampaigns,
            supporterTypeBreakdown,
        });
    }

    // GET /Donor/Portal
    [HttpGet("Portal")]
    public IActionResult GetPortal(string? email = null)
    {
        var identityEmail = User?.Identity?.Name;
        var resolvedEmail = string.IsNullOrWhiteSpace(identityEmail) ? email : identityEmail;

        if (string.IsNullOrWhiteSpace(resolvedEmail))
            return Unauthorized(new { message = "A logged-in donor email is required." });

        var normalizedEmail = resolvedEmail.Trim().ToLowerInvariant();

        var matchingSupporters = _db.Supporters
            .AsNoTracking()
            .Where(s => s.Email != null && s.Email.ToLower() == normalizedEmail)
            .OrderByDescending(s => s.CreatedAt)
            .ToList();

        if (matchingSupporters.Count == 0)
        {
            return Ok(new
            {
                displayName = FallbackDisplayName(resolvedEmail),
                email = resolvedEmail,
                supporterId = (int?)null,
                supporterType = (string?)null,
                status = "Active",
                totalDonations = 0,
                totalDonationValue = 0m,
                history = Array.Empty<object>(),
            });
        }

        var primarySupporter = matchingSupporters
            .OrderByDescending(s => !string.IsNullOrWhiteSpace(s.DisplayName))
            .ThenByDescending(s => s.Status == "Active")
            .ThenByDescending(s => s.CreatedAt)
            .First();

        var supporterIds = matchingSupporters
            .Select(s => s.SupporterId)
            .ToList();

        var donations = _db.Donations
            .Include(d => d.Supporter)
            .Where(d => supporterIds.Contains(d.SupporterId))
            .OrderByDescending(d => d.DonationDate)
            .ToList();

        var history = donations
            .Select(d =>
            {
                var totalAllocated = _db.DonationAllocations
                    .Where(a => a.DonationId == d.DonationId)
                    .Sum(a => (decimal?)a.AmountAllocated) ?? 0m;

                return new
                {
                    donationId = d.DonationId,
                    donationType = d.DonationType,
                    donationDate = d.DonationDate.ToString("yyyy-MM-dd"),
                    amount = d.Amount,
                    estimatedValue = d.EstimatedValue,
                    currencyCode = d.CurrencyCode ?? "USD",
                    isRecurring = d.IsRecurring,
                    channelSource = d.ChannelSource,
                    campaignName = d.CampaignName,
                    notes = d.Notes,
                    totalAllocated,
                };
            })
            .ToList();

        return Ok(new
        {
            displayName = primarySupporter.DisplayName,
            email = primarySupporter.Email,
            supporterId = primarySupporter.SupporterId,
            supporterType = primarySupporter.SupporterType,
            status = primarySupporter.Status,
            totalDonations = history.Count,
            totalDonationValue = donations.Sum(DonationValue),
            history,
        });
    }

    // GET /Donor/Supporters
    [HttpGet("Supporters")]
    [Authorize(Roles = AppRoles.Admin + "," + AppRoles.DonationsManager)]
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
            .ToList()
            .Select(MapSupporter)
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

    // POST /Donor/Supporters
    [HttpPost("Supporters")]
    [Authorize(Roles = AppRoles.Admin + "," + AppRoles.DonationsManager)]
    public IActionResult CreateSupporter([FromBody] SupporterPayload payload)
    {
        if (string.IsNullOrWhiteSpace(payload.supporterType))
            return BadRequest("Supporter type is required.");

        if (string.IsNullOrWhiteSpace(payload.status))
            return BadRequest("Status is required.");

        var supporter = new Supporter
        {
            SupporterType = payload.supporterType,
            Status = payload.status,
            FirstName = payload.firstName,
            LastName = payload.lastName,
            Email = payload.email,
            Phone = payload.phone,
            OrganizationName = payload.organizationName,
            RelationshipType = "Local",
            CreatedAt = DateTime.UtcNow,
            DisplayName = "",
        };

        supporter.DisplayName = BuildDisplayName(supporter);

        _db.Supporters.Add(supporter);
        _db.SaveChanges();

        return Ok(MapSupporter(supporter));
    }

    // GET /Donor/Contributions
    [HttpGet("Contributions")]
    [Authorize(Roles = AppRoles.Admin + "," + AppRoles.DonationsManager)]
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

        if (!string.IsNullOrWhiteSpace(programArea))
            query = query.Where(d => _db.DonationAllocations.Any(a => a.DonationId == d.DonationId && a.ProgramArea == programArea));

        if (!string.IsNullOrWhiteSpace(safehouseAllocation))
        {
            query = query.Where(d =>
                _db.DonationAllocations
                    .Join(_db.Safehouses,
                        a => a.SafehouseId,
                        s => s.SafehouseId,
                        (a, s) => new { a.DonationId, s.Name })
                    .Any(x => x.DonationId == d.DonationId && x.Name == safehouseAllocation));
        }

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
            .ThenByDescending(d => d.DonationId)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToList()
            .Select(d =>
            {
                var allocation = _db.DonationAllocations
                    .Join(_db.Safehouses,
                        a => a.SafehouseId,
                        s => s.SafehouseId,
                        (a, s) => new { a.DonationId, a.ProgramArea, SafehouseName = s.Name })
                    .FirstOrDefault(x => x.DonationId == d.DonationId);

                return MapContribution(d, allocation?.SafehouseName, allocation?.ProgramArea);
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

    // POST /Donor/Contributions
    [HttpPost("Contributions")]
    [Authorize(Roles = AppRoles.Admin + "," + AppRoles.DonationsManager)]
    public IActionResult CreateContribution([FromBody] ContributionPayload payload)
    {
        if (!_db.Supporters.Any(s => s.SupporterId == payload.supporterId))
            return BadRequest("Supporter not found.");

        if (string.IsNullOrWhiteSpace(payload.donationType))
            return BadRequest("Donation type is required.");

        var donationDate = DateOnly.FromDateTime(DateTime.Today);
        if (!string.IsNullOrWhiteSpace(payload.donationDate) && DateOnly.TryParse(payload.donationDate, out var parsedDate))
            donationDate = parsedDate;

        var donation = new Donation
        {
            SupporterId = payload.supporterId,
            DonationType = payload.donationType,
            DonationDate = donationDate,
            ChannelSource = string.IsNullOrWhiteSpace(payload.channelSource) ? "Direct" : payload.channelSource,
            CurrencyCode = string.IsNullOrWhiteSpace(payload.currencyCode) ? "USD" : payload.currencyCode,
            Amount = payload.amount,
            EstimatedValue = payload.estimatedValue,
            IsRecurring = payload.isRecurring,
            Notes = payload.notes,
        };

        _db.Donations.Add(donation);
        _db.SaveChanges();

        _db.Entry(donation).Reference(d => d.Supporter).Load();

        return Ok(MapContribution(donation));
    }

    // PUT /Donor/Contributions/{id}
    [HttpPut("Contributions/{id}")]
    [Authorize(Roles = AppRoles.Admin + "," + AppRoles.DonationsManager)]
    public IActionResult UpdateContribution(int id, [FromBody] ContributionPayload payload)
    {
        var donation = _db.Donations.Include(d => d.Supporter).FirstOrDefault(d => d.DonationId == id);
        if (donation == null)
            return NotFound();

        if (!_db.Supporters.Any(s => s.SupporterId == payload.supporterId))
            return BadRequest("Supporter not found.");

        if (string.IsNullOrWhiteSpace(payload.donationType))
            return BadRequest("Donation type is required.");

        donation.SupporterId = payload.supporterId;
        donation.DonationType = payload.donationType;
        donation.ChannelSource = string.IsNullOrWhiteSpace(payload.channelSource) ? "Direct" : payload.channelSource;
        donation.CurrencyCode = string.IsNullOrWhiteSpace(payload.currencyCode) ? "USD" : payload.currencyCode;
        donation.Amount = payload.amount;
        donation.EstimatedValue = payload.estimatedValue;
        donation.IsRecurring = payload.isRecurring;
        donation.Notes = payload.notes;

        if (!string.IsNullOrWhiteSpace(payload.donationDate) && DateOnly.TryParse(payload.donationDate, out var parsedDate))
            donation.DonationDate = parsedDate;

        _db.SaveChanges();
        _db.Entry(donation).Reference(d => d.Supporter).Load();

        return Ok(MapContribution(donation));
    }

    // PUT /Donor/{id}
    [HttpPut("{id}")]
    [Authorize(Roles = AppRoles.Admin + "," + AppRoles.DonationsManager)]
    public IActionResult UpdateDonor(int id, [FromBody] SupporterPayload payload)
    {
        var donor = _db.Supporters.FirstOrDefault(s => s.SupporterId == id);

        if (donor == null)
            return NotFound();

        if (!string.IsNullOrWhiteSpace(payload.supporterType))
            donor.SupporterType = payload.supporterType;

        if (!string.IsNullOrWhiteSpace(payload.status))
            donor.Status = payload.status;

        donor.FirstName = payload.firstName;
        donor.LastName = payload.lastName;
        donor.Email = payload.email;
        donor.Phone = payload.phone;
        donor.OrganizationName = payload.organizationName;
        donor.DisplayName = BuildDisplayName(donor);

        _db.SaveChanges();

        return Ok(MapSupporter(donor));
    }

    // DELETE /Donor/{id}
    [HttpDelete("{id}")]
    [Authorize(Roles = AppRoles.Admin + "," + AppRoles.DonationsManager)]
    public IActionResult DeleteDonor(int id)
    {
        var donor = _db.Supporters.FirstOrDefault(s => s.SupporterId == id);

        if (donor == null)
            return NotFound();

        if (id == AnonymousSupporterId)
            return BadRequest("The anonymous supporter record cannot be deleted.");

        var donationIds = _db.Donations
            .Where(d => d.SupporterId == id)
            .Select(d => d.DonationId)
            .ToList();

        foreach (var donationId in donationIds)
            DeleteDonationGraph(donationId);

        _db.Supporters.Remove(donor);
        _db.SaveChanges();

        return Ok();
    }

    // DELETE /Donor/Contributions/{id}
    [HttpDelete("Contributions/{id}")]
    [Authorize(Roles = AppRoles.Admin + "," + AppRoles.DonationsManager)]
    public IActionResult DeleteContribution(int id)
    {
        var donation = _db.Donations.FirstOrDefault(d => d.DonationId == id);
        if (donation == null)
            return NotFound();

        var supporterId = donation.SupporterId;

        DeleteDonationGraph(id);

        if (supporterId != AnonymousSupporterId)
        {
            var supporterHasOtherDonations = _db.Donations.Any(d => d.SupporterId == supporterId);
            if (!supporterHasOtherDonations)
            {
                var supporter = _db.Supporters.FirstOrDefault(s => s.SupporterId == supporterId);
                if (supporter != null)
                    _db.Supporters.Remove(supporter);
            }
        }

        _db.SaveChanges();
        return Ok();
    }
}
