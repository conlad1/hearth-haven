using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace HearthHaven.API.Data;

[Table("partners")]
public class Partner
{
    [Key]
    [Column("partner_id")]
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    public int PartnerId { get; set; }

    [Column("partner_name")]
    public required string PartnerName { get; set; }

    [Column("partner_type")]
    public required string PartnerType { get; set; }

    [Column("role_type")]
    public required string RoleType { get; set; }

    [Column("contact_name")]
    public string? ContactName { get; set; }

    [Column("email")]
    public string? Email { get; set; }

    [Column("phone")]
    public string? Phone { get; set; }

    [Column("region")]
    public string? Region { get; set; }

    [Column("status")]
    public required string Status { get; set; }

    [Column("start_date")]
    public DateOnly StartDate { get; set; }

    [Column("end_date")]
    public DateOnly? EndDate { get; set; }

    [Column("notes")]
    public string? Notes { get; set; }
}
