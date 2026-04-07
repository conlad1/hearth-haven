using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace HearthHaven.API.Data;

[Table("process_recordings")]
public class ProcessRecording
{
    [Key]
    [Column("recording_id")]
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    public int RecordingId { get; set; }

    [Column("resident_id")]
    public int ResidentId { get; set; }

    [Column("session_date")]
    public DateOnly SessionDate { get; set; }

    [Column("social_worker")]
    public required string SocialWorker { get; set; }

    [Column("session_type")]
    public required string SessionType { get; set; }

    [Column("session_duration_minutes")]
    public int SessionDurationMinutes { get; set; }

    [Column("emotional_state_observed")]
    public required string EmotionalStateObserved { get; set; }

    [Column("emotional_state_end")]
    public required string EmotionalStateEnd { get; set; }

    [Column("session_narrative")]
    public string? SessionNarrative { get; set; }

    [Column("interventions_applied")]
    public string? InterventionsApplied { get; set; }

    [Column("follow_up_actions")]
    public string? FollowUpActions { get; set; }

    [Column("progress_noted")]
    public bool ProgressNoted { get; set; }

    [Column("concerns_flagged")]
    public bool ConcernsFlagged { get; set; }

    [Column("referral_made")]
    public bool ReferralMade { get; set; }

    [Column("notes_restricted")]
    public string? NotesRestricted { get; set; }

    [ForeignKey(nameof(ResidentId))]
    public Resident? Resident { get; set; }
}
