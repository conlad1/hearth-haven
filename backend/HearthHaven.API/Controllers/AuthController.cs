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
        private readonly UserManager<IdentityUser> _userManager;
        private readonly SignInManager<IdentityUser> _signInManager;

        public AuthController(UserManager<IdentityUser> userManager, SignInManager<IdentityUser> signInManager)
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
            // 1. Create a new user object
            var user = new IdentityUser { UserName = model.Email, Email = model.Email };
            
            // 2. Pass it to Identity to hash the password and save to the database
            var result = await _userManager.CreateAsync(user, model.Password);

            if (result.Succeeded)
            {
                // In the future, we will link this AspNetUser to their row in the 'supporters' table here
                return Ok(new { Message = "User registered successfully." });
            }

            return BadRequest(result.Errors);
        }

        [HttpPost("login")]
        public async Task<IActionResult> Login([FromBody] LoginDto model)
        {
            // PasswordSignInAsync handles password verification and lockout policies securely
            var result = await _signInManager.PasswordSignInAsync(
                model.Email, 
                model.Password, 
                isPersistent: false, 
                lockoutOnFailure: true);

            if (result.Succeeded)
            {
                // For now, return a success message. Later, we'll return a JWT token or cookie here!
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
