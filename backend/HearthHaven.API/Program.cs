using HearthHaven.API.Controllers;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Identity;
using HearthHaven.API.Data;
using HearthHaven.API.Models;
using System.Globalization;

var builder = WebApplication.CreateBuilder(args);

// 1. Connection string
var connectionString = builder.Configuration.GetConnectionString("AZURE_SQL_CONNECTIONSTRING");

if (string.IsNullOrWhiteSpace(connectionString))
{
    throw new InvalidOperationException(
        "Missing connection string 'AZURE_SQL_CONNECTIONSTRING'. Configure it with user secrets, environment variables, or hosted application settings.");
}

// 2. Databases
builder.Services.AddDbContext<HearthHavenDbContext>(options =>
    options.UseSqlServer(connectionString, sql =>
    {
        sql.CommandTimeout(60);
        sql.EnableRetryOnFailure(
            maxRetryCount: 5,
            maxRetryDelay: TimeSpan.FromSeconds(10),
            errorNumbersToAdd: null);
    }));

builder.Services.AddDbContext<SecurityDbContext>(options =>
    options.UseSqlServer(connectionString, sql =>
    {
        sql.CommandTimeout(60);
        sql.EnableRetryOnFailure(
            maxRetryCount: 5,
            maxRetryDelay: TimeSpan.FromSeconds(10),
            errorNumbersToAdd: null);
    }));

// SHOW THIS: 
// Identity
builder.Services.AddIdentity<ApplicationUser, IdentityRole>(options =>
{
    options.Password.RequireDigit = true;
    options.Password.RequireLowercase = true;
    options.Password.RequiredLength = 14;
    options.Password.RequireUppercase = true;
    options.Password.RequireNonAlphanumeric = true;
    options.Password.RequiredUniqueChars = 4;
    options.User.RequireUniqueEmail = true;
    options.Lockout.AllowedForNewUsers = true;
    options.Lockout.DefaultLockoutTimeSpan = TimeSpan.FromMinutes(15);
    options.Lockout.MaxFailedAccessAttempts = 5;
})
.AddEntityFrameworkStores<SecurityDbContext>()
.AddDefaultTokenProviders();

// COOKIE CONFIG
var cookieDomain = builder.Configuration["CookieDomain"]; // e.g. ".the-hearth-project.org" in production
builder.Services.ConfigureApplicationCookie(options =>
{
    options.Cookie.HttpOnly = true;
    options.Cookie.SameSite = SameSiteMode.None; // REQUIRED for frontend
    options.Cookie.SecurePolicy = CookieSecurePolicy.Always; // REQUIRED for HTTPS
    if (!string.IsNullOrEmpty(cookieDomain))
        options.Cookie.Domain = cookieDomain; // Share cookie across subdomains (fixes iOS Safari)
});

// ✅ 5. CORS CONFIG (LONG-TERM CLEAN WAY)
var allowedOrigins = builder.Configuration.GetSection("AllowedOrigins").Get<string[]>() ?? new string[0];

builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowReactApp", policy =>
    {
        policy.WithOrigins(allowedOrigins)
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials(); // REQUIRED for cookies
    });
});

builder.Services.AddHttpClient("MLService", client =>
{
    client.BaseAddress = new Uri(builder.Configuration["MLSERVICE_URL"] ?? "http://localhost:8000");
    client.Timeout = TimeSpan.FromSeconds(10);
});

builder.Services.AddControllers();
builder.Services.AddOpenApi();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

var app = builder.Build();

await SeedIdentityAsync(app.Services);

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
    app.UseSwagger();
    app.UseSwaggerUI();
}
else
{
    app.UseExceptionHandler("/Error");
    app.UseHsts();
}

app.UseHttpsRedirection();

app.Use(async (context, next) =>
{
    context.Response.OnStarting(() =>
    {
        context.Response.Headers["Content-Security-Policy"] =
            "default-src 'self'; " +
            "base-uri 'self'; " +
            "object-src 'none'; " +
            "frame-ancestors 'self'; " +
            "script-src 'self'; " +
            "style-src 'self' 'unsafe-inline'; " +
            "img-src 'self' data: https: blob:; " +
            "font-src 'self' data:; " +
            "connect-src 'self' https://api.web3forms.com; " +
            "frame-src https://www.youtube.com; " +
            "form-action 'self' https://api.web3forms.com;";

        return Task.CompletedTask;
    });

    await next();
});

// ✅ IMPORTANT ORDER
app.UseCors("AllowReactApp");   // must be BEFORE auth
app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

app.Run();

static async Task SeedIdentityAsync(IServiceProvider services)
{
    using var scope = services.CreateScope();
    var roleManager = scope.ServiceProvider.GetRequiredService<RoleManager<IdentityRole>>();
    var userManager = scope.ServiceProvider.GetRequiredService<UserManager<ApplicationUser>>();
    var logger = scope.ServiceProvider.GetRequiredService<ILoggerFactory>().CreateLogger("IdentitySeed");

    foreach (var roleName in AppRoles.All)
    {
        if (!await roleManager.RoleExistsAsync(roleName))
        {
            await roleManager.CreateAsync(new IdentityRole(roleName));
        }
    }

    var users = await userManager.Users.ToListAsync();
    var adminRoleId = await roleManager.Roles
        .Where(r => r.Name == AppRoles.Admin)
        .Select(r => r.Id)
        .FirstOrDefaultAsync();
    var hasAnyAdmin = adminRoleId != null && await scope.ServiceProvider
        .GetRequiredService<SecurityDbContext>()
        .UserRoles
        .AnyAsync(ur => ur.RoleId == adminRoleId);

    var bootstrapAdmins = !hasAnyAdmin;

    foreach (var user in users)
    {
        var desiredDisplayName = BuildDisplayName(user.Email ?? user.UserName);
        if (string.IsNullOrWhiteSpace(user.DisplayName))
        {
            user.DisplayName = desiredDisplayName;
            await userManager.UpdateAsync(user);
        }

        if (!bootstrapAdmins)
        {
            continue;
        }

        var currentRoles = await userManager.GetRolesAsync(user);
        if (currentRoles.Count > 0)
        {
            await userManager.RemoveFromRolesAsync(user, currentRoles);
        }

        await userManager.AddToRoleAsync(user, AppRoles.Admin);
    }

    if (bootstrapAdmins)
    {
        logger.LogInformation("No admins found. Bootstrapped {UserCount} existing users into Admin role.", users.Count);
    }
}

static string BuildDisplayName(string? email)
{
    if (string.IsNullOrWhiteSpace(email))
        return "User";

    var localPart = email.Split('@')[0].Trim();
    if (string.IsNullOrWhiteSpace(localPart))
        return "User";

    var cleaned = localPart.Replace('.', ' ').Replace('_', ' ').Replace('-', ' ').Trim();
    return string.IsNullOrWhiteSpace(cleaned)
        ? "User"
        : CultureInfo.InvariantCulture.TextInfo.ToTitleCase(cleaned);
}