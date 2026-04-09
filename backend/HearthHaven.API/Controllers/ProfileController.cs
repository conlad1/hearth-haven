using HearthHaven.API.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using HearthHaven.API.Models;

namespace HearthHaven.API.Controllers;

[Route("api/[controller]")]
[ApiController]
[Authorize]
public class ProfileController : ControllerBase
{
    private readonly HearthHavenDbContext _db;
    private readonly UserManager<ApplicationUser> _userManager;

    public ProfileController(HearthHavenDbContext db, UserManager<ApplicationUser> userManager)
    {
        _db = db;
        _userManager = userManager;
    }

    public sealed class ProfilePayload
    {
        public string? supporterType { get; set; }
        public string? displayName { get; set; }
        public string? organizationName { get; set; }
        public string? firstName { get; set; }
        public string? lastName { get; set; }
        public string? relationshipType { get; set; }
        public string? region { get; set; }
        public string? country { get; set; }
        public string? email { get; set; }
        public string? phone { get; set; }
        public string? status { get; set; }
        public string? firstDonationDate { get; set; }
        public string? acquisitionChannel { get; set; }
    }

    private static string FallbackDisplayName(string? email)
    {
        if (string.IsNullOrWhiteSpace(email))
            return "Supporter";

        var localPart = email.Split('@')[0].Trim();
        if (string.IsNullOrWhiteSpace(localPart))
            return "Supporter";

        var cleaned = localPart.Replace('.', ' ').Replace('_', ' ').Replace('-', ' ').Trim();
        return string.IsNullOrWhiteSpace(cleaned)
            ? "Supporter"
            : System.Globalization.CultureInfo.InvariantCulture.TextInfo.ToTitleCase(cleaned);
    }

    private static string ComputeDisplayName(
        string? explicitDisplayName,
        string? organizationName,
        string? firstName,
        string? lastName,
        string? email,
        string? supporterType)
    {
        if (!string.IsNullOrWhiteSpace(explicitDisplayName))
            return explicitDisplayName.Trim();

        if (!string.IsNullOrWhiteSpace(organizationName))
            return organizationName.Trim();

        var fullName = $"{firstName} {lastName}".Trim();
        if (!string.IsNullOrWhiteSpace(fullName))
            return fullName;

        if (!string.IsNullOrWhiteSpace(email))
            return email.Trim();

        return string.IsNullOrWhiteSpace(supporterType) ? "Supporter" : supporterType.Trim();
    }

    private object MapProfile(Supporter supporter) => new
    {
        supporterId = supporter.SupporterId,
        supporterType = supporter.SupporterType,
        displayName = supporter.DisplayName,
        organizationName = supporter.OrganizationName,
        firstName = supporter.FirstName,
        lastName = supporter.LastName,
        relationshipType = supporter.RelationshipType,
        region = supporter.Region,
        country = supporter.Country,
        email = supporter.Email,
        phone = supporter.Phone,
        status = supporter.Status,
        firstDonationDate = supporter.FirstDonationDate?.ToString("yyyy-MM-dd"),
        acquisitionChannel = supporter.AcquisitionChannel,
        createdAt = supporter.CreatedAt.ToString("o"),
    };

    private async Task<(ApplicationUser user, Supporter? supporter)> ResolveCurrentAsync()
    {
        var user = await _userManager.GetUserAsync(User)
            ?? throw new UnauthorizedAccessException("No authenticated user.");

        var email = user.Email ?? user.UserName;
        var normalizedEmail = email?.Trim().ToLowerInvariant();

        var supporter = string.IsNullOrWhiteSpace(normalizedEmail)
            ? null
            : await _db.Supporters
                .OrderByDescending(s => s.CreatedAt)
                .FirstOrDefaultAsync(s => s.Email != null && s.Email.ToLower() == normalizedEmail);

        return (user, supporter);
    }

    [HttpGet("me")]
    public async Task<IActionResult> GetProfile()
    {
        var (user, supporter) = await ResolveCurrentAsync();
        var email = user.Email ?? user.UserName;
        var roles = await _userManager.GetRolesAsync(user);
        var role = roles.FirstOrDefault() ?? AppRoles.User;
        var identityDisplayName = string.IsNullOrWhiteSpace(user.DisplayName)
            ? FallbackDisplayName(email)
            : user.DisplayName.Trim();

        if (supporter == null)
        {
            return Ok(new
            {
                supporterId = (int?)null,
                supporterType = "MonetaryDonor",
                displayName = FallbackDisplayName(email),
                organizationName = (string?)null,
                firstName = (string?)null,
                lastName = (string?)null,
                relationshipType = "Local",
                region = (string?)null,
                country = (string?)null,
                email,
                phone = (string?)null,
                status = "Active",
                firstDonationDate = (string?)null,
                acquisitionChannel = (string?)null,
                createdAt = (string?)null,
                identityDisplayName,
                role,
            });
        }

        return Ok(new
        {
            supporterId = supporter.SupporterId,
            supporterType = supporter.SupporterType,
            displayName = supporter.DisplayName,
            organizationName = supporter.OrganizationName,
            firstName = supporter.FirstName,
            lastName = supporter.LastName,
            relationshipType = supporter.RelationshipType,
            region = supporter.Region,
            country = supporter.Country,
            email = supporter.Email,
            phone = supporter.Phone,
            status = supporter.Status,
            firstDonationDate = supporter.FirstDonationDate?.ToString("yyyy-MM-dd"),
            acquisitionChannel = supporter.AcquisitionChannel,
            createdAt = supporter.CreatedAt.ToString("o"),
            identityDisplayName,
            role,
        });
    }

    [HttpPut("me")]
    public async Task<IActionResult> UpdateProfile([FromBody] ProfilePayload payload)
    {
        var (user, supporter) = await ResolveCurrentAsync();

        var newEmail = string.IsNullOrWhiteSpace(payload.email)
            ? (user.Email ?? user.UserName)
            : payload.email.Trim();

        if (string.IsNullOrWhiteSpace(newEmail))
            return BadRequest("Email is required.");

        var emailConflict = await _userManager.FindByEmailAsync(newEmail);
        if (emailConflict != null && emailConflict.Id != user.Id)
            return BadRequest("That email is already being used by another account.");

        if (!string.Equals(user.Email, newEmail, StringComparison.OrdinalIgnoreCase))
        {
            user.Email = newEmail;
            user.UserName = newEmail;
            var identityResult = await _userManager.UpdateAsync(user);
            if (!identityResult.Succeeded)
            {
                return BadRequest(identityResult.Errors.Select(e => e.Description));
            }
        }

        user.DisplayName = ComputeDisplayName(
            payload.displayName,
            payload.organizationName,
            payload.firstName,
            payload.lastName,
            newEmail,
            payload.supporterType);

        var nameUpdateResult = await _userManager.UpdateAsync(user);
        if (!nameUpdateResult.Succeeded)
        {
            return BadRequest(nameUpdateResult.Errors.Select(e => e.Description));
        }

        if (supporter == null)
        {
            supporter = new Supporter
            {
                SupporterType = string.IsNullOrWhiteSpace(payload.supporterType) ? "MonetaryDonor" : payload.supporterType.Trim(),
                DisplayName = "",
                OrganizationName = null,
                FirstName = null,
                LastName = null,
                RelationshipType = string.IsNullOrWhiteSpace(payload.relationshipType) ? "Local" : payload.relationshipType.Trim(),
                Region = null,
                Country = null,
                Email = newEmail,
                Phone = null,
                Status = string.IsNullOrWhiteSpace(payload.status) ? "Active" : payload.status.Trim(),
                FirstDonationDate = null,
                AcquisitionChannel = null,
                CreatedAt = DateTime.UtcNow,
            };

            _db.Supporters.Add(supporter);
        }

        supporter.SupporterType = string.IsNullOrWhiteSpace(payload.supporterType) ? supporter.SupporterType : payload.supporterType.Trim();
        supporter.OrganizationName = string.IsNullOrWhiteSpace(payload.organizationName) ? null : payload.organizationName.Trim();
        supporter.FirstName = string.IsNullOrWhiteSpace(payload.firstName) ? null : payload.firstName.Trim();
        supporter.LastName = string.IsNullOrWhiteSpace(payload.lastName) ? null : payload.lastName.Trim();
        supporter.RelationshipType = string.IsNullOrWhiteSpace(payload.relationshipType) ? "Local" : payload.relationshipType.Trim();
        supporter.Region = string.IsNullOrWhiteSpace(payload.region) ? null : payload.region.Trim();
        supporter.Country = string.IsNullOrWhiteSpace(payload.country) ? null : payload.country.Trim();
        supporter.Email = newEmail;
        supporter.Phone = string.IsNullOrWhiteSpace(payload.phone) ? null : payload.phone.Trim();
        supporter.Status = string.IsNullOrWhiteSpace(payload.status) ? "Active" : payload.status.Trim();
        supporter.AcquisitionChannel = string.IsNullOrWhiteSpace(payload.acquisitionChannel) ? null : payload.acquisitionChannel.Trim();

        if (string.IsNullOrWhiteSpace(payload.firstDonationDate))
        {
            supporter.FirstDonationDate = null;
        }
        else if (DateOnly.TryParse(payload.firstDonationDate, out var firstDonationDate))
        {
            supporter.FirstDonationDate = firstDonationDate;
        }
        else
        {
            return BadRequest("First donation date must be a valid date.");
        }

        supporter.DisplayName = ComputeDisplayName(
            payload.displayName,
            supporter.OrganizationName,
            supporter.FirstName,
            supporter.LastName,
            newEmail,
            supporter.SupporterType);

        await _db.SaveChangesAsync();

        var roles = await _userManager.GetRolesAsync(user);
        var role = roles.FirstOrDefault() ?? AppRoles.User;

        return Ok(new
        {
            supporterId = supporter.SupporterId,
            supporterType = supporter.SupporterType,
            displayName = supporter.DisplayName,
            organizationName = supporter.OrganizationName,
            firstName = supporter.FirstName,
            lastName = supporter.LastName,
            relationshipType = supporter.RelationshipType,
            region = supporter.Region,
            country = supporter.Country,
            email = supporter.Email,
            phone = supporter.Phone,
            status = supporter.Status,
            firstDonationDate = supporter.FirstDonationDate?.ToString("yyyy-MM-dd"),
            acquisitionChannel = supporter.AcquisitionChannel,
            createdAt = supporter.CreatedAt.ToString("o"),
            identityDisplayName = string.IsNullOrWhiteSpace(user.DisplayName) ? FallbackDisplayName(newEmail) : user.DisplayName.Trim(),
            role,
        });
    }
}
