using Microsoft.AspNetCore.Mvc;

namespace HearthHaven.API.Controllers;


[Route("[controller]")]
[ApiController]
public class DonationController : ControllerBase
{
    private readonly HearthHavenDbContext _hearthHavenContext;

    public DonationController(HearthHavenDbContext temp) => _hearthHavenContext = temp;
    
    [HttpGet("AllDonations")]
    public IActionResult GetDonations(int numDonations = 10)
    {
        var donations = _hearthHavenContext.Donations
            .Take(numDonations)
            .ToList();
        
        return Ok(donations);
    }
}