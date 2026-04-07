using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using HearthHaven.API.Data;
using HearthHaven.API.Models;

namespace HearthHaven.API.Controllers;

[Route("[controller]")]
[ApiController]
public class DonationController : ControllerBase
{
    private readonly HearthHavenDbContext _hearthHavenContext;

    public DonationController(HearthHavenDbContext temp) => _hearthHavenContext = temp;

    // GET /Donation/AllDonations
    [HttpGet("AllDonations")]
    public IActionResult GetDonations(int numDonations = 10)
    {
        var donations = _hearthHavenContext.Donations
            .OrderByDescending(x => x.DonationDate)
            .Take(numDonations)
            .ToList();

        return Ok(donations);
    }

    // POST /Donation/CreateDonation
    [HttpPost("CreateDonation")]
    [AllowAnonymous]
    public async Task<IActionResult> CreateDonation([FromBody] DonationRequest payload)
    {
        if (payload?.Donation == null)
            return BadRequest("Donation data is required");

        int supporterId;

        // Anonymous donation → use the fixed anonymous supporter (ID 62)
        if (payload.Donation.is_anonymous)
        {
            const int anonymousSupporterId = 62;
            var exists = _hearthHavenContext.Supporters.Any(s => s.SupporterId == anonymousSupporterId);
            if (!exists)
                return BadRequest("Anonymous supporter (ID 62) does not exist.");
            supporterId = anonymousSupporterId;
        }
        // Logged-in donor → create a new Supporter row
        else
        {
            if (payload.Supporter == null)
                return BadRequest("Supporter info required for non-anonymous donation");

            var displayName = payload.Supporter.organization_name
                ?? $"{payload.Supporter.first_name} {payload.Supporter.last_name}".Trim();

            var supporter = new Supporter
            {
                SupporterType    = payload.Supporter.supporter_type,
                DisplayName      = string.IsNullOrEmpty(displayName) ? "Anonymous" : displayName,
                RelationshipType = "Local",
                FirstName        = payload.Supporter.first_name,
                LastName         = payload.Supporter.last_name,
                Email            = payload.Supporter.email,
                OrganizationName = payload.Supporter.organization_name,
                Status           = payload.Supporter.status,
                CreatedAt        = DateTime.UtcNow,
            };

            try
            {
                _hearthHavenContext.Supporters.Add(supporter);
                await _hearthHavenContext.SaveChangesAsync();
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Supporter insert failed: {ex.InnerException?.Message ?? ex.Message}");
            }

            supporterId = supporter.SupporterId;
        }

        var donation = new Donation
        {
            DonationType   = payload.Donation.donation_type,
            Amount         = payload.Donation.amount,
            EstimatedValue = payload.Donation.estimated_value,
            CurrencyCode   = payload.Donation.currency_code,
            IsRecurring    = payload.Donation.is_recurring,
            ChannelSource  = payload.Donation.channel_source ?? "Direct",
            Notes          = payload.Donation.notes,
            SupporterId    = supporterId,
            DonationDate   = DateOnly.FromDateTime(DateTime.Now),
        };

        try
        {
            _hearthHavenContext.Donations.Add(donation);
            await _hearthHavenContext.SaveChangesAsync();
        }
        catch (Exception ex)
        {
            return StatusCode(500, $"Donation insert failed: {ex.InnerException?.Message ?? ex.Message}");
        }

        return Ok(new { message = "Donation created successfully", donationId = donation.DonationId });
    }
}
