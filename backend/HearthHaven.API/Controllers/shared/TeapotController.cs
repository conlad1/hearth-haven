using Microsoft.AspNetCore.Mvc;

namespace HearthHaven.API.Controllers;

[Route("[controller]")]
[ApiController]
public class TeapotController : ControllerBase
{
    [HttpGet]
    public IActionResult GetTeapot()
    {
        return StatusCode(418, new
        {
            status = 418,
            title = "I'm a teapot",
            message = "Hearth Haven's server refuses to brew coffee because it is, in fact, a teapot.",
            suggestion = "Please pour tea and return to serving the community."
        });
    }
}
