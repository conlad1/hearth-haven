using Microsoft.AspNetCore.Identity;

namespace HearthHaven.API.Models;

public class ApplicationUser : IdentityUser
{
    public string? DisplayName { get; set; }
}