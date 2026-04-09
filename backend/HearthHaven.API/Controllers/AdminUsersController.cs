using HearthHaven.API.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace HearthHaven.API.Controllers;

[Authorize(Roles = AppRoles.Admin)]
[Route("AdminUsers")]
[ApiController]
public class AdminUsersController : ControllerBase
{
    private readonly UserManager<ApplicationUser> _userManager;

    public AdminUsersController(UserManager<ApplicationUser> userManager)
    {
        _userManager = userManager;
    }

    public sealed class AdminUserDto
    {
        public required string Id { get; set; }
        public required string Email { get; set; }
        public string? UserName { get; set; }
        public string? DisplayName { get; set; }
        public string? PhoneNumber { get; set; }
        public bool EmailConfirmed { get; set; }
        public required string[] Roles { get; set; }
    }

    public sealed class UpdateAdminUserDto
    {
        public string? Email { get; set; }
        public string? DisplayName { get; set; }
        public string? PhoneNumber { get; set; }
        public string[]? Roles { get; set; }
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<AdminUserDto>>> GetAll()
    {
        var users = await _userManager.Users
            .OrderBy(u => u.Email)
            .ToListAsync();

        var result = new List<AdminUserDto>(users.Count);
        foreach (var user in users)
        {
            var roles = await _userManager.GetRolesAsync(user);
            result.Add(MapUser(user, roles));
        }

        return Ok(result);
    }

    [HttpGet("roles")]
    public ActionResult<IEnumerable<string>> GetAssignableRoles()
    {
        return Ok(AppRoles.All);
    }

    [HttpPut("{id}")]
    public async Task<ActionResult<AdminUserDto>> Update(string id, [FromBody] UpdateAdminUserDto model)
    {
        var user = await _userManager.FindByIdAsync(id);
        if (user == null)
        {
            return NotFound(new { Message = "User not found." });
        }

        var requestedEmail = model.Email?.Trim();
        if (string.IsNullOrWhiteSpace(requestedEmail))
        {
            return BadRequest(new { Message = "Email is required." });
        }

        var requestedRoles = (model.Roles ?? [])
            .Where(role => !string.IsNullOrWhiteSpace(role))
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToArray();

        if (requestedRoles.Length != 1)
        {
            return BadRequest(new { Message = "Exactly one role must be assigned." });
        }

        var invalidRoles = requestedRoles.Except(AppRoles.All, StringComparer.OrdinalIgnoreCase).ToArray();
        if (invalidRoles.Length > 0)
        {
            return BadRequest(new { Message = "One or more roles are invalid.", InvalidRoles = invalidRoles });
        }

        var existingRoles = await _userManager.GetRolesAsync(user);
        var userIsCurrentlyAdmin = existingRoles.Contains(AppRoles.Admin, StringComparer.OrdinalIgnoreCase);
        var userWillBeAdmin = requestedRoles.Contains(AppRoles.Admin, StringComparer.OrdinalIgnoreCase);
        var currentUserId = _userManager.GetUserId(User);
        var isSelfEdit = string.Equals(currentUserId, user.Id, StringComparison.Ordinal);

        if (isSelfEdit && userIsCurrentlyAdmin && !userWillBeAdmin)
        {
            return BadRequest(new { Message = "Admins cannot demote themselves from the Admin role." });
        }

        if (userIsCurrentlyAdmin && !userWillBeAdmin)
        {
            var adminUsers = await _userManager.GetUsersInRoleAsync(AppRoles.Admin);
            if (adminUsers.Count <= 1)
            {
                return BadRequest(new { Message = "Cannot remove the Admin role from the last remaining Admin account." });
            }
        }

        var normalizedEmail = _userManager.NormalizeEmail(requestedEmail);
        if (!string.IsNullOrEmpty(normalizedEmail))
        {
            var duplicateExists = await _userManager.Users.AnyAsync(u => u.Id != user.Id && u.NormalizedEmail == normalizedEmail);
            if (duplicateExists)
            {
                return Conflict(new { Message = "Another user already uses this email." });
            }
        }

        var currentEmail = await _userManager.GetEmailAsync(user);
        if (!string.Equals(currentEmail, requestedEmail, StringComparison.OrdinalIgnoreCase))
        {
            var setEmail = await _userManager.SetEmailAsync(user, requestedEmail);
            if (!setEmail.Succeeded)
            {
                return BadRequest(setEmail.Errors);
            }

            var setUserName = await _userManager.SetUserNameAsync(user, requestedEmail);
            if (!setUserName.Succeeded)
            {
                return BadRequest(setUserName.Errors);
            }
        }

        user.DisplayName = string.IsNullOrWhiteSpace(model.DisplayName) ? requestedEmail : model.DisplayName.Trim();
        user.PhoneNumber = string.IsNullOrWhiteSpace(model.PhoneNumber) ? null : model.PhoneNumber.Trim();

        // Validate phone number if provided
        if (!string.IsNullOrWhiteSpace(user.PhoneNumber) && !IsValidPhoneNumber(user.PhoneNumber))
        {
            return BadRequest(new { Message = "Please enter a valid phone number (10-15 digits with common separators like +, -, .)." });
        }

        var updateResult = await _userManager.UpdateAsync(user);
        if (!updateResult.Succeeded)
        {
            return BadRequest(updateResult.Errors);
        }

        var rolesToRemove = existingRoles.Except(requestedRoles, StringComparer.OrdinalIgnoreCase).ToArray();
        var rolesToAdd = requestedRoles.Except(existingRoles, StringComparer.OrdinalIgnoreCase).ToArray();

        if (rolesToRemove.Length > 0)
        {
            var removeResult = await _userManager.RemoveFromRolesAsync(user, rolesToRemove);
            if (!removeResult.Succeeded)
            {
                return BadRequest(removeResult.Errors);
            }
        }

        if (rolesToAdd.Length > 0)
        {
            var addResult = await _userManager.AddToRolesAsync(user, rolesToAdd);
            if (!addResult.Succeeded)
            {
                return BadRequest(addResult.Errors);
            }
        }

        var finalRoles = await _userManager.GetRolesAsync(user);
        return Ok(MapUser(user, finalRoles));
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(string id)
    {
        var currentUserId = _userManager.GetUserId(User);
        if (string.Equals(currentUserId, id, StringComparison.Ordinal))
        {
            return BadRequest(new { Message = "Admins cannot delete their own account." });
        }

        var user = await _userManager.FindByIdAsync(id);
        if (user == null)
        {
            return NotFound(new { Message = "User not found." });
        }

        var userRoles = await _userManager.GetRolesAsync(user);
        var userIsAdmin = userRoles.Contains(AppRoles.Admin, StringComparer.OrdinalIgnoreCase);
        if (userIsAdmin)
        {
            var adminUsers = await _userManager.GetUsersInRoleAsync(AppRoles.Admin);
            if (adminUsers.Count <= 1)
            {
                return BadRequest(new { Message = "Cannot delete the last remaining Admin account." });
            }
        }

        var result = await _userManager.DeleteAsync(user);
        if (!result.Succeeded)
        {
            return BadRequest(result.Errors);
        }

        return NoContent();
    }

    private static AdminUserDto MapUser(ApplicationUser user, IEnumerable<string> roles)
    {
        return new AdminUserDto
        {
            Id = user.Id,
            Email = user.Email ?? string.Empty,
            UserName = user.UserName,
            DisplayName = user.DisplayName,
            PhoneNumber = user.PhoneNumber,
            EmailConfirmed = user.EmailConfirmed,
            Roles = roles.OrderBy(r => r).ToArray(),
        };
    }

    private static bool IsValidPhoneNumber(string phone)
    {
        if (string.IsNullOrWhiteSpace(phone))
            return true; // Phone is optional

        // Must have between 10 and 15 digits
        var digitsOnly = System.Text.RegularExpressions.Regex.Replace(phone, @"\D", "");
        if (digitsOnly.Length < 10 || digitsOnly.Length > 15)
            return false;

        // Only allow digits and common separators: +, -, ., (, ), space
        if (!System.Text.RegularExpressions.Regex.IsMatch(phone, @"^[0-9\s\-\.\+\(\)]*$"))
            return false;

        return true;
    }
}
