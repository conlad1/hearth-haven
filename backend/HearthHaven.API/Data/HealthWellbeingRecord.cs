using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace HearthHaven.API.Data;

[Table("health_wellbeing_records")]
public class HealthWellbeingRecord
{
    [Key]
    [Column("health_record_id")]
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    public int HealthRecordId { get; set; }

    [Column("resident_id")]
    public int ResidentId { get; set; }

    [Column("record_date")]
    public DateOnly RecordDate { get; set; }

    [Column("general_health_score")]
    [Precision(3, 1)]
    public decimal? GeneralHealthScore { get; set; }

    [Column("nutrition_score")]
    [Precision(3, 1)]
    public decimal? NutritionScore { get; set; }

    [Column("sleep_quality_score")]
    [Precision(3, 1)]
    public decimal? SleepQualityScore { get; set; }

    [Column("energy_level_score")]
    [Precision(3, 1)]
    public decimal? EnergyLevelScore { get; set; }

    [Column("height_cm")]
    [Precision(5, 1)]
    public decimal? HeightCm { get; set; }

    [Column("weight_kg")]
    [Precision(5, 2)]
    public decimal? WeightKg { get; set; }

    [Column("bmi")]
    [Precision(5, 2)]
    public decimal? Bmi { get; set; }

    [Column("medical_checkup_done")]
    public bool MedicalCheckupDone { get; set; }

    [Column("dental_checkup_done")]
    public bool DentalCheckupDone { get; set; }

    [Column("psychological_checkup_done")]
    public bool PsychologicalCheckupDone { get; set; }

    [Column("notes")]
    public string? Notes { get; set; }

    [ForeignKey(nameof(ResidentId))]
    public Resident? Resident { get; set; }
}
