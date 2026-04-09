namespace HearthHaven.API.Models;

public static class AppRoles
{
    public const string Admin = "Admin";
    public const string CaseManager = "CaseManager";
    public const string DonationsManager = "DonationsManager";
    public const string OutreachManager = "OutreachManager";
    public const string User = "User";

    public static readonly string[] All = [Admin, CaseManager, DonationsManager, OutreachManager, User];
}