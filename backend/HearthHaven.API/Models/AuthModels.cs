using System.ComponentModel.DataAnnotations;

namespace HearthHaven.API.Models 
{
    public class RegisterDto
    {
        [Required]
        [EmailAddress]
        public required string Email { get; set; }

        [Required]
        public required string DisplayName { get; set; }

        [Required]
        public required string Password { get; set; }
    }

    public class LoginDto
    {
        [Required]
        [EmailAddress]
        public required string Email { get; set; }

        [Required]
        public required string Password { get; set; }
    }

    public sealed class CurrentUserDto
    {
        public required string Email { get; set; }
        public required string DisplayName { get; set; }
        public required string[] Roles { get; set; }
    }
}