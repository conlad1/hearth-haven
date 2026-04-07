using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace HearthHaven.API.Data;

[Table("supporters")]
public class Supporter
{
    [Key]
    [Column("supporter_id")]
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    public int SupporterId { get; set; }

    [Column("supporter_type")]
    public required string SupporterType { get; set; }

    [Column("display_name")]
    public required string DisplayName { get; set; }

    [Column("organization_name")]
    public string? OrganizationName { get; set; }

    [Column("first_name")]
    public string? FirstName { get; set; }

    [Column("last_name")]
    public string? LastName { get; set; }

    [Column("relationship_type")]
    public required string RelationshipType { get; set; }

    [Column("region")]
    public string? Region { get; set; }

    [Column("country")]
    public string? Country { get; set; }

    [Column("email")]
    public string? Email { get; set; }

    [Column("phone")]
    public string? Phone { get; set; }

    [Column("status")]
    public required string Status { get; set; }

    [Column("first_donation_date")]
    public DateOnly? FirstDonationDate { get; set; }

    [Column("acquisition_channel")]
    public string? AcquisitionChannel { get; set; }

    [Column("created_at")]
    public DateTime CreatedAt { get; set; }
}
