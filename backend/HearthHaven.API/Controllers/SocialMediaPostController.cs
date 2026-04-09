using Microsoft.AspNetCore.Mvc;
using HearthHaven.API.Data;
using HearthHaven.API.Models;
using Microsoft.AspNetCore.Authorization;

namespace HearthHaven.API.Controllers;

[Authorize(Roles = AppRoles.Admin + "," + AppRoles.OutreachManager)]
[Route("[controller]")]
[ApiController]
public class SocialMediaPostController : ControllerBase
{
    private readonly HearthHavenDbContext _db;

    public SocialMediaPostController(HearthHavenDbContext db) => _db = db;

    [HttpGet]
    public IActionResult GetAll(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        [FromQuery] string? search = null,
        [FromQuery] string? platform = null,
        [FromQuery] string? postType = null,
        [FromQuery] string? mediaType = null,
        [FromQuery] string? contentTopic = null)
    {
        var query = _db.SocialMediaPosts.AsQueryable();

        if (!string.IsNullOrWhiteSpace(platform))
            query = query.Where(p => p.Platform == platform);

        if (!string.IsNullOrWhiteSpace(postType))
            query = query.Where(p => p.PostType == postType);

        if (!string.IsNullOrWhiteSpace(mediaType))
            query = query.Where(p => p.MediaType == mediaType);

        if (!string.IsNullOrWhiteSpace(contentTopic))
            query = query.Where(p => p.ContentTopic == contentTopic);

        if (!string.IsNullOrWhiteSpace(search))
        {
            var term = search.ToLower();
            query = query.Where(p =>
                p.Platform.ToLower().Contains(term) ||
                p.PostType.ToLower().Contains(term) ||
                p.ContentTopic.ToLower().Contains(term) ||
                p.MediaType.ToLower().Contains(term) ||
                (p.Caption != null && p.Caption.ToLower().Contains(term)) ||
                (p.CampaignName != null && p.CampaignName.ToLower().Contains(term)));
        }

        var totalCount = query.Count();
        var totalPages = Math.Max(1, (int)Math.Ceiling(totalCount / (double)pageSize));

        var data = query
            .OrderByDescending(p => p.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToList();

        return Ok(new { data, totalCount, page, pageSize, totalPages });
    }

    [HttpGet("FilterOptions")]
    public IActionResult GetFilterOptions()
    {
        return Ok(new
        {
            platforms = _db.SocialMediaPosts.Select(p => p.Platform).Distinct().OrderBy(s => s).ToList(),
            postTypes = _db.SocialMediaPosts.Select(p => p.PostType).Distinct().OrderBy(s => s).ToList(),
            mediaTypes = _db.SocialMediaPosts.Select(p => p.MediaType).Distinct().OrderBy(s => s).ToList(),
            contentTopics = _db.SocialMediaPosts.Select(p => p.ContentTopic).Distinct().OrderBy(s => s).ToList(),
            sentimentTones = _db.SocialMediaPosts.Select(p => p.SentimentTone).Distinct().OrderBy(s => s).ToList(),
            callToActionTypes = _db.SocialMediaPosts.Where(p => p.CallToActionType != null).Select(p => p.CallToActionType!).Distinct().OrderBy(s => s).ToList(),
        });
    }

    [HttpGet("{id:int}")]
    public async Task<IActionResult> GetById(int id)
    {
        var post = await _db.SocialMediaPosts.FindAsync(id);
        if (post == null) return NotFound();
        return Ok(post);
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] SocialMediaPost post)
    {
        post.DayOfWeek = post.CreatedAt.DayOfWeek.ToString();
        post.PostHour = post.CreatedAt.Hour;
        post.CaptionLength = post.Caption?.Length ?? 0;

        try
        {
            _db.SocialMediaPosts.Add(post);
            await _db.SaveChangesAsync();
            return CreatedAtAction(nameof(GetById), new { id = post.PostId }, post);
        }
        catch (Exception ex)
        {
            return StatusCode(500, ex.InnerException?.Message ?? ex.Message);
        }
    }

    [HttpPut("{id:int}")]
    public async Task<IActionResult> Update(int id, [FromBody] SocialMediaPost updated)
    {
        var post = await _db.SocialMediaPosts.FindAsync(id);
        if (post == null) return NotFound($"Post {id} not found.");

        updated.DayOfWeek = updated.CreatedAt.DayOfWeek.ToString();
        updated.PostHour = updated.CreatedAt.Hour;
        updated.CaptionLength = updated.Caption?.Length ?? 0;

        _db.Entry(post).CurrentValues.SetValues(updated);
        post.PostId = id;

        try
        {
            await _db.SaveChangesAsync();
            return Ok(post);
        }
        catch (Exception ex)
        {
            return StatusCode(500, ex.InnerException?.Message ?? ex.Message);
        }
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id)
    {
        var post = await _db.SocialMediaPosts.FindAsync(id);
        if (post == null) return NotFound($"Post {id} not found.");

        _db.SocialMediaPosts.Remove(post);
        await _db.SaveChangesAsync();
        return Ok(new { message = "Deleted." });
    }
}
