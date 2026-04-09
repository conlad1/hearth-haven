namespace HearthHaven.API.Models;

public sealed class SocialMediaPostUpsertDto
{
    public required string Platform { get; set; }
    public required string PlatformPostId { get; set; }
    public string? PostUrl { get; set; }
    public DateTime CreatedAt { get; set; }
    public required string PostType { get; set; }
    public required string MediaType { get; set; }
    public string? Caption { get; set; }
    public string? Hashtags { get; set; }
    public int NumHashtags { get; set; }
    public int MentionsCount { get; set; }
    public bool HasCallToAction { get; set; }
    public string? CallToActionType { get; set; }
    public required string ContentTopic { get; set; }
    public required string SentimentTone { get; set; }
    public bool FeaturesResidentStory { get; set; }
    public string? CampaignName { get; set; }
    public bool IsBoosted { get; set; }
    public decimal? BoostBudgetPhp { get; set; }
    public int Impressions { get; set; }
    public int Reach { get; set; }
    public int Likes { get; set; }
    public int Comments { get; set; }
    public int Shares { get; set; }
    public int Saves { get; set; }
    public int ClickThroughs { get; set; }
    public int? VideoViews { get; set; }
    public decimal EngagementRate { get; set; }
    public int ProfileVisits { get; set; }
    public int DonationReferrals { get; set; }
    public decimal EstimatedDonationValuePhp { get; set; }
    public int FollowerCountAtPost { get; set; }
    public int? WatchTimeSeconds { get; set; }
    public int? AvgViewDurationSeconds { get; set; }
    public int? SubscriberCountAtPost { get; set; }
    public int? Forwards { get; set; }
}
