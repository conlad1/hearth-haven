using HearthHaven.API.Controllers;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Identity;
using HearthHaven.API.Data;

var builder = WebApplication.CreateBuilder(args);

// 1. Connection string
var connectionString = builder.Configuration.GetConnectionString("AZURE_SQL_CONNECTIONSTRING");

// 2. Databases
builder.Services.AddDbContext<HearthHavenDbContext>(options =>
    options.UseSqlServer(connectionString));

builder.Services.AddDbContext<SecurityDbContext>(options =>
    options.UseSqlServer(connectionString));

// 3. Identity
builder.Services.AddIdentity<IdentityUser, IdentityRole>(options =>
{
    options.Password.RequireDigit = true;
    options.Password.RequiredLength = 12;
    options.Password.RequireUppercase = true;
    options.Password.RequireNonAlphanumeric = true;
})
.AddEntityFrameworkStores<SecurityDbContext>()
.AddDefaultTokenProviders();

// ✅ 4. COOKIE CONFIG (CRITICAL)
builder.Services.ConfigureApplicationCookie(options =>
{
    options.Cookie.HttpOnly = true;
    options.Cookie.SameSite = SameSiteMode.None; // REQUIRED for frontend
    options.Cookie.SecurePolicy = CookieSecurePolicy.Always; // REQUIRED for HTTPS
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

builder.Services.AddControllers();
builder.Services.AddOpenApi();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();

// ✅ IMPORTANT ORDER
app.UseCors("AllowReactApp");   // must be BEFORE auth
app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

app.Run();