namespace HearthHaven.API.Models;

public class DonationRequest
{
    public SupporterDto? Supporter { get; set; }
    public required DonationDto Donation { get; set; }
}

public class SupporterDto
{
    public required string supporter_type { get; set; }
    public string? first_name { get; set; }
    public string? last_name { get; set; }
    public string? email { get; set; }
    public string? organization_name { get; set; }
    public required string status { get; set; }
}

public class DonationDto
{
    public required string donation_type { get; set; }
    public bool is_recurring { get; set; }
    public string? currency_code { get; set; }
    public decimal? amount { get; set; }
    public decimal? estimated_value { get; set; }
    public string? channel_source { get; set; }
    public string? notes { get; set; }
    public bool is_anonymous { get; set; }
}

public class AllocationRequest
{
    public int donation_id { get; set; }
    public int safehouse_id { get; set; }
    public required string program_area { get; set; }
    public decimal amount_allocated { get; set; }
    public DateTime allocation_date { get; set; }
    public string? notes { get; set; }
}
