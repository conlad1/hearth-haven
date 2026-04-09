using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using HearthHaven.API.Models; 

namespace HearthHaven.API.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class AuthController : ControllerBase
    {
        private readonly UserManager<ApplicationUser> _userManager;
        private readonly SignInManager<ApplicationUser> _signInManager;

        public AuthController(UserManager<ApplicationUser> userManager, SignInManager<ApplicationUser> signInManager)
        {
            _userManager = userManager;
            _signInManager = signInManager;
        }

        public sealed class ChangePasswordDto
        {
            public string? CurrentPassword { get; set; }
            public string? NewPassword { get; set; }
        }

        [HttpPost("register")]
        public async Task<IActionResult> Register([FromBody] RegisterDto model)
        {
            var user = new ApplicationUser
            {
                UserName = model.Email,
                Email = model.Email,
                DisplayName = string.IsNullOrWhiteSpace(model.DisplayName)
                    ? model.Email.Trim()
                    : model.DisplayName.Trim(),
            };
            
            var result = await _userManager.CreateAsync(user, model.Password);

            if (result.Succeeded)
            {
                await _userManager.AddToRoleAsync(user, AppRoles.User);
                return Ok(new { Message = "User registered successfully." });
            }

            return BadRequest(result.Errors);
        }

        [HttpPost("login")]
        public async Task<IActionResult> Login([FromBody] LoginDto model)
        {
            var result = await _signInManager.PasswordSignInAsync(
                model.Email, 
                model.Password, 
                isPersistent: false, 
                lockoutOnFailure: true);

            if (result.Succeeded)
            {
                return Ok(new { Message = "Login successful." });
            }

            return Unauthorized(new { Message = "Invalid login attempt." });
        }

        [HttpPost("logout")]
        public async Task<IActionResult> Logout()
        {
            await _signInManager.SignOutAsync();
            return Ok(new { Message = "Logout successful." });
        }

        [HttpGet("me")]
        [Authorize]
        public async Task<ActionResult<CurrentUserDto>> Me()
        {
            var user = await _userManager.GetUserAsync(User);
            if (user == null)
            {
                return Unauthorized();
            }

            var email = user.Email ?? user.UserName ?? string.Empty;
            var displayName = string.IsNullOrWhiteSpace(user.DisplayName)
                ? email
                : user.DisplayName.Trim();
            var roles = await _userManager.GetRolesAsync(user);

            return Ok(new CurrentUserDto
            {
                Email = email,
                DisplayName = displayName,
                Roles = roles.ToArray(),
            });
        }

        [HttpPost("change-password")]
        [Authorize]
        public async Task<IActionResult> ChangePassword([FromBody] ChangePasswordDto model)
        {
            if (string.IsNullOrWhiteSpace(model.CurrentPassword) || string.IsNullOrWhiteSpace(model.NewPassword))
                return BadRequest(new { Message = "Current password and new password are required." });

            var user = await _userManager.GetUserAsync(User);
            if (user == null)
                return Unauthorized(new { Message = "User not found." });

            var result = await _userManager.ChangePasswordAsync(user, model.CurrentPassword, model.NewPassword);
            if (!result.Succeeded)
                return BadRequest(result.Errors.Select(e => e.Description));

            await _signInManager.RefreshSignInAsync(user);
            return Ok(new { Message = "Password changed successfully." });
        }
    }
}
