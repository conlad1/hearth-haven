using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace HearthHaven.API.Controllers;

[Route("[controller]")]
[ApiController]
public class OutreachController : ControllerBase
{
    private readonly HearthHavenDbContext _hearthHavenContext;

    public OutreachController(HearthHavenDbContext temp) => _hearthHavenContext = temp;

    [HttpGet("summary")]
    public async Task<IActionResult> GetSummary()
    {
        var posts = _hearthHavenContext.SocialMediaPosts.AsNoTracking();

        var totalPosts = await posts.CountAsync();
        var totalReach = await posts.SumAsync(p => (long)p.Reach);
        var totalImpressions = await posts.SumAsync(p => (long)p.Impressions);
        var totalClicks = await posts.SumAsync(p => (long)p.ClickThroughs);
        var avgEngagementRate = totalPosts == 0
            ? 0
            : await posts.AverageAsync(p => (double)p.EngagementRate);

        var channelBreakdown = await posts
            .GroupBy(p => p.Platform)
            .Select(g => new
            {
                platform = g.Key,
                postCount = g.Count(),
                reach = g.Sum(x => (long)x.Reach),
                impressions = g.Sum(x => (long)x.Impressions),
                clickThroughs = g.Sum(x => (long)x.ClickThroughs),
                avgEngagementRate = g.Average(x => (double)x.EngagementRate),
                donationReferrals = g.Sum(x => x.DonationReferrals)
            })
            .OrderByDescending(x => x.reach)
            .ToListAsync();

        var topContent = await posts
            .OrderByDescending(p => p.EngagementRate)
            .ThenByDescending(p => p.Reach)
            .Select(p => new
            {
                postId = p.PostId,
                platform = p.Platform,
                postType = p.PostType,
                contentTopic = p.ContentTopic,
                createdAt = p.CreatedAt,
                reach = p.Reach,
                engagementRate = p.EngagementRate,
                clickThroughs = p.ClickThroughs,
                donationReferrals = p.DonationReferrals,
                campaignName = p.CampaignName
            })
            .Take(5)
            .ToListAsync();

        var latestPublishedSnapshot = await _hearthHavenContext.PublicImpactSnapshots
            .AsNoTracking()
            .Where(x => x.IsPublished)
            .OrderByDescending(x => x.SnapshotDate)
            .Select(x => new
            {
                snapshotId = x.SnapshotId,
                snapshotDate = x.SnapshotDate.ToString("yyyy-MM-dd"),
                headline = x.Headline,
                summaryText = x.SummaryText,
                metricPayloadJson = x.MetricPayloadJson
            })
            .FirstOrDefaultAsync();

        var bestChannel = channelBreakdown.FirstOrDefault()?.platform ?? "Instagram";
        var recommendations = new[]
        {
            $"Prioritize {bestChannel}: it currently drives the strongest reach footprint.",
            "Repurpose high-engagement posts into short video or carousel variants within 48 hours.",
            "Attach a clear donation call-to-action to all campaign posts to improve referral conversion."
        };

        var ctr = totalImpressions == 0 ? 0 : (double)totalClicks / totalImpressions * 100;

        return Ok(new
        {
            generatedAt = DateTime.UtcNow,
            kpis = new
            {
                totalPosts,
                totalReach,
                totalImpressions,
                totalClicks,
                avgEngagementRate,
                clickThroughRate = ctr
            },
            channelBreakdown,
            topContent,
            recommendations,
            latestPublishedSnapshot
        });
    }
}
