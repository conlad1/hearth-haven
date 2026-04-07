using HearthHaven.API.Controllers;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Identity;

var builder = WebApplication.CreateBuilder(args);
// 1. Tell .NET where to find your database using the connection string we just made
builder.Services.AddDbContext<SecurityDbContext>(options =>
    options.UseSqlServer(builder.Configuration.GetConnectionString("SecurityDbConnection")));

builder.Services.AddDbContext<HearthHavenDbContext>(options =>
    options.UseSqlServer(builder.Configuration.GetConnectionString("AZURE_SQL_CONNECTIONSTRING")));

// 2. Turn on ASP.NET Core Identity and link it to your SecurityDbContext
builder.Services.AddIdentity<IdentityUser, IdentityRole>(options => 
{
    // IS 414 requires strict password policies. You can set them here later!
    options.Password.RequireDigit = true;
    options.Password.RequiredLength = 12; // Example strict policy
})
.AddEntityFrameworkStores<SecurityDbContext>()
.AddDefaultTokenProviders();
// Add services to the container.

builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend", policy =>
    {
        policy.WithOrigins("http://localhost:3000")
              .AllowAnyHeader()
              .AllowAnyMethod();
    });
});

builder.Services.AddControllers();
// Learn more about configuring OpenAPI at https://aka.ms/aspnet/openapi
builder.Services.AddOpenApi();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

string? connection;
if (builder.Environment.IsDevelopment())
{
    builder.Configuration.AddEnvironmentVariables().AddJsonFile("appsettings.Development.json");
    connection = builder.Configuration.GetConnectionString("AZURE_SQL_CONNECTIONSTRING");
}
else
{
    connection = Environment.GetEnvironmentVariable("AZURE_SQL_CONNECTIONSTRING");
}

builder.Services.AddDbContext<HearthHavenDbContext>(options =>
    options.UseSqlServer(connection));

var app = builder.Build();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();

app.UseCors("AllowFrontend");

app.UseAuthorization();

app.MapControllers();

app.Run();
