using Microsoft.AspNetCore.Identity;
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
    }
}
