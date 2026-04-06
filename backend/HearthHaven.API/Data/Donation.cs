using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace HearthHaven.API.Data;

[Table("donations")]
public class Donation
{
    [Key]
    [Column("donation_id")]
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    public int DonationId { get; set; }

    [Column("supporter_id")]
    public int SupporterId { get; set; }

    [Column("donation_type")]
    public required string DonationType { get; set; }

    [Column("donation_date")]
    public DateOnly DonationDate { get; set; }

    [Column("channel_source")]
    public required string ChannelSource { get; set; }

    [Column("currency_code")]
    public string? CurrencyCode { get; set; }

    [Column("amount")]
    public decimal? Amount { get; set; }

    [Column("estimated_value")]
    public decimal? EstimatedValue { get; set; }

    [Column("impact_unit")]
    public string? ImpactUnit { get; set; }

    [Column("is_recurring")]
    public bool IsRecurring { get; set; }

    [Column("campaign_name")]
    public string? CampaignName { get; set; }

    [Column("notes")]
    public string? Notes { get; set; }

    [Column("created_by_partner_id")]
    public int? CreatedByPartnerId { get; set; }

    [Column("referral_post_id")]
    public int? ReferralPostId { get; set; }

    [ForeignKey(nameof(SupporterId))]
    public Supporter? Supporter { get; set; }

    [ForeignKey(nameof(CreatedByPartnerId))]
    public Partner? CreatedByPartner { get; set; }

    [ForeignKey(nameof(ReferralPostId))]
    public SocialMediaPost? ReferralPost { get; set; }
}
