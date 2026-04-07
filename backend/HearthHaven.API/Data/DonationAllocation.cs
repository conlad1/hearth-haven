using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace HearthHaven.API.Data;

[Table("donation_allocations")]
public class DonationAllocation
{
    [Key]
    [Column("allocation_id")]
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    public int AllocationId { get; set; }

    [Column("donation_id")]
    public int DonationId { get; set; }

    [Column("safehouse_id")]
    public int SafehouseId { get; set; }

    [Column("program_area")]
    public required string ProgramArea { get; set; }

    [Column("amount_allocated")]
    [Precision(14, 2)]
    public decimal AmountAllocated { get; set; }

    [Column("allocation_date")]
    public DateOnly AllocationDate { get; set; }

    [Column("allocation_notes")]
    public string? AllocationNotes { get; set; }

    [ForeignKey(nameof(DonationId))]
    public Donation? Donation { get; set; }

    [ForeignKey(nameof(SafehouseId))]
    public Safehouse? Safehouse { get; set; }
}
