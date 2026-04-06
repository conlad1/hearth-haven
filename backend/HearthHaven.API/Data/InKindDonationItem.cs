using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace HearthHaven.API.Data;

[Table("in_kind_donation_items")]
public class InKindDonationItem
{
    [Key]
    [Column("item_id")]
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    public int ItemId { get; set; }

    [Column("donation_id")]
    public int DonationId { get; set; }

    [Column("item_name")]
    public required string ItemName { get; set; }

    [Column("item_category")]
    public required string ItemCategory { get; set; }

    [Column("quantity")]
    public int Quantity { get; set; }

    [Column("unit_of_measure")]
    public required string UnitOfMeasure { get; set; }

    [Column("estimated_unit_value")]
    public decimal EstimatedUnitValue { get; set; }

    [Column("intended_use")]
    public required string IntendedUse { get; set; }

    [Column("received_condition")]
    public required string ReceivedCondition { get; set; }

    [ForeignKey(nameof(DonationId))]
    public Donation? Donation { get; set; }
}
