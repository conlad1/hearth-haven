using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace HearthHaven.API.Data;

[Table("incident_reports")]
public class IncidentReport
{
    [Key]
    [Column("incident_id")]
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    public int IncidentId { get; set; }

    [Column("resident_id")]
    public int ResidentId { get; set; }

    [Column("safehouse_id")]
    public int SafehouseId { get; set; }

    [Column("incident_date")]
    public DateOnly IncidentDate { get; set; }

    [Column("incident_type")]
    public required string IncidentType { get; set; }

    [Column("severity")]
    public required string Severity { get; set; }

    [Column("description")]
    public string? Description { get; set; }

    [Column("response_taken")]
    public string? ResponseTaken { get; set; }

    [Column("resolved")]
    public bool Resolved { get; set; }

    [Column("resolution_date")]
    public DateOnly? ResolutionDate { get; set; }

    [Column("reported_by")]
    public required string ReportedBy { get; set; }

    [Column("follow_up_required")]
    public bool FollowUpRequired { get; set; }

    [ForeignKey(nameof(ResidentId))]
    public Resident? Resident { get; set; }

    [ForeignKey(nameof(SafehouseId))]
    public Safehouse? Safehouse { get; set; }
}
