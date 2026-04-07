using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace HearthHaven.API.Data;

[Table("safehouses")]
public class Safehouse
{
    [Key]
    [Column("safehouse_id")]
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    public int SafehouseId { get; set; }

    [Column("safehouse_code")]
    public required string SafehouseCode { get; set; }

    [Column("name")]
    public required string Name { get; set; }

    [Column("region")]
    public required string Region { get; set; }

    [Column("city")]
    public required string City { get; set; }

    [Column("province")]
    public required string Province { get; set; }

    [Column("country")]
    public required string Country { get; set; }

    [Column("open_date")]
    public DateOnly OpenDate { get; set; }

    [Column("status")]
    public required string Status { get; set; }

    [Column("capacity_girls")]
    public int CapacityGirls { get; set; }

    [Column("capacity_staff")]
    public int CapacityStaff { get; set; }

    [Column("current_occupancy")]
    public int CurrentOccupancy { get; set; }

    [Column("notes")]
    public string? Notes { get; set; }
}
