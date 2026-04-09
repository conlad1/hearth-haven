using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;
using HearthHaven.API.Models;

namespace HearthHaven.API.Controllers; // **IMPORTANT: Change 'YourProjectName.API' to match your actual project's namespace**

    // This class inherits from IdentityDbContext, which contains all the pre-written 
    // code Microsoft made to manage the AspNetUsers tables.
    public class SecurityDbContext : IdentityDbContext<ApplicationUser>
    {
        // The constructor passes the database connection options up to the base class
        public SecurityDbContext(DbContextOptions<SecurityDbContext> options)
            : base(options)
        {
        }
    }
