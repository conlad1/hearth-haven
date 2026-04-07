using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace HearthHaven.API.Data;

[Table("intervention_plans")]
public class InterventionPlan
{
    [Key]
    [Column("plan_id")]
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    public int PlanId { get; set; }

    [Column("resident_id")]
    public int ResidentId { get; set; }

    [Column("plan_category")]
    public required string PlanCategory { get; set; }

    [Column("plan_description")]
    public required string PlanDescription { get; set; }

    [Column("services_provided")]
    public string? ServicesProvided { get; set; }

    [Column("target_value")]
    [Precision(10, 2)]
    public decimal? TargetValue { get; set; }

    [Column("target_date")]
    public DateOnly TargetDate { get; set; }

    [Column("status")]
    public required string Status { get; set; }

    [Column("case_conference_date")]
    public DateOnly? CaseConferenceDate { get; set; }

    [Column("created_at")]
    public DateTime CreatedAt { get; set; }

    [Column("updated_at")]
    public DateTime UpdatedAt { get; set; }

    [ForeignKey(nameof(ResidentId))]
    public Resident? Resident { get; set; }
}
