using HearthHaven.API.Data;
using HearthHaven.API.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace HearthHaven.API.Controllers;

[Authorize(Roles = AppRoles.Admin + "," + AppRoles.OutreachManager)]
[Route("[controller]")]
[ApiController]
public class ReportsController : ControllerBase
{
    private readonly HearthHavenDbContext _context;

    public ReportsController(HearthHavenDbContext context) => _context = context;

    private IQueryable<Safehouse> FilteredSafehouses(string? region) =>
        string.IsNullOrEmpty(region)
            ? _context.Safehouses
            : _context.Safehouses.Where(s => s.Region == region);

    private DateOnly? GetCutoff(int months) =>
        months > 0 ? DateOnly.FromDateTime(DateTime.UtcNow.AddMonths(-months)) : null;

    /// <summary>
    /// High-level KPIs for the reports page header.
    /// </summary>
    [HttpGet("Summary")]
    public IActionResult GetSummary(string? region = null, int months = 12)
    {
        var cutoff = GetCutoff(months);
        var safehouseIds = FilteredSafehouses(region).Select(s => s.SafehouseId);

        // Donations: filter by date, region via allocations
        var donationsQuery = _context.Donations.AsQueryable();
        if (cutoff.HasValue)
            donationsQuery = donationsQuery.Where(d => d.DonationDate >= cutoff.Value);
        if (!string.IsNullOrEmpty(region))
        {
            var donationIds = _context.DonationAllocations
                .Where(a => safehouseIds.Contains(a.SafehouseId))
                .Select(a => a.DonationId)
                .Distinct();
            donationsQuery = donationsQuery.Where(d => donationIds.Contains(d.DonationId));
        }

        var totalDonationCount = donationsQuery.Count();
        var totalDonationAmount = donationsQuery
            .Where(d => d.Amount.HasValue)
            .Sum(d => d.Amount) ?? 0;

        // Active residents
        var activeResidents = _context.Residents
            .Where(r => r.CaseStatus == "Active" && safehouseIds.Contains(r.SafehouseId))
            .Count();

        // Education/health from latest month in SafehouseMonthlyMetrics
        var metricsQuery = _context.SafehouseMonthlyMetrics
            .Where(m => safehouseIds.Contains(m.SafehouseId));
        if (cutoff.HasValue)
            metricsQuery = metricsQuery.Where(m => m.MonthStart >= cutoff.Value);

        var latestMonth = metricsQuery.Max(m => (DateOnly?)m.MonthStart);
        decimal? avgEducationProgress = null;
        decimal? avgHealthScore = null;

        if (latestMonth.HasValue)
        {
            var latestMetrics = metricsQuery.Where(m => m.MonthStart == latestMonth.Value);
            var totalResidentsInMetrics = latestMetrics.Sum(m => m.ActiveResidents);
            if (totalResidentsInMetrics > 0)
            {
                avgEducationProgress = latestMetrics
                    .Where(m => m.AvgEducationProgress.HasValue)
                    .Sum(m => m.AvgEducationProgress!.Value * m.ActiveResidents) / totalResidentsInMetrics;
                avgHealthScore = latestMetrics
                    .Where(m => m.AvgHealthScore.HasValue)
                    .Sum(m => m.AvgHealthScore!.Value * m.ActiveResidents) / totalResidentsInMetrics;
            }
        }

        // Reintegration rate
        var reintResidents = _context.Residents
            .Where(r => safehouseIds.Contains(r.SafehouseId)
                        && r.ReintegrationType != null
                        && r.ReintegrationType != "None");
        var reintTotal = reintResidents.Count();
        var reintCompleted = reintResidents.Count(r => r.ReintegrationStatus == "Completed");
        var reintegrationCompletionRate = reintTotal > 0 ? (decimal)reintCompleted / reintTotal : 0;

        // Safehouse count
        var safehouseCount = FilteredSafehouses(region).Count(s => s.Status == "Active");

        return Ok(new
        {
            totalDonationCount,
            totalDonationAmount,
            activeResidents,
            avgEducationProgress = avgEducationProgress.HasValue ? Math.Round(avgEducationProgress.Value, 1) : (decimal?)null,
            avgHealthScore = avgHealthScore.HasValue ? Math.Round(avgHealthScore.Value, 1) : (decimal?)null,
            reintegrationCompletionRate = Math.Round(reintegrationCompletionRate, 3),
            safehouseCount,
        });
    }

    /// <summary>
    /// Donation trends: monthly totals, by type, by region, recurring vs one-time.
    /// </summary>
    [HttpGet("DonationTrends")]
    public IActionResult GetDonationTrends(string? region = null, int months = 12)
    {
        var cutoff = GetCutoff(months);
        var safehouseIds = FilteredSafehouses(region).Select(s => s.SafehouseId);

        var donationsQuery = _context.Donations.AsQueryable();
        if (cutoff.HasValue)
            donationsQuery = donationsQuery.Where(d => d.DonationDate >= cutoff.Value);
        if (!string.IsNullOrEmpty(region))
        {
            var donationIds = _context.DonationAllocations
                .Where(a => safehouseIds.Contains(a.SafehouseId))
                .Select(a => a.DonationId)
                .Distinct();
            donationsQuery = donationsQuery.Where(d => donationIds.Contains(d.DonationId));
        }

        // Monthly totals
        var monthlyTotals = donationsQuery
            .GroupBy(d => new { d.DonationDate.Year, d.DonationDate.Month })
            .Select(g => new
            {
                month = g.Key.Year + "-" + (g.Key.Month < 10 ? "0" : "") + g.Key.Month,
                totalAmount = g.Sum(d => d.Amount ?? d.EstimatedValue ?? 0),
                donationCount = g.Count(),
            })
            .OrderBy(x => x.month)
            .ToList();

        // By type
        var byType = donationsQuery
            .GroupBy(d => d.DonationType)
            .Select(g => new
            {
                donationType = g.Key,
                totalAmount = g.Sum(d => d.Amount ?? d.EstimatedValue ?? 0),
                count = g.Count(),
            })
            .OrderByDescending(x => x.totalAmount)
            .ToList();

        // By region (via allocations)
        var allocationsQuery = _context.DonationAllocations
            .Join(_context.Safehouses,
                a => a.SafehouseId,
                s => s.SafehouseId,
                (a, s) => new { a, s });

        if (cutoff.HasValue)
            allocationsQuery = allocationsQuery.Where(x => x.a.AllocationDate >= cutoff.Value);
        if (!string.IsNullOrEmpty(region))
            allocationsQuery = allocationsQuery.Where(x => x.s.Region == region);

        var byRegion = allocationsQuery
            .GroupBy(x => x.s.Region)
            .Select(g => new
            {
                region = g.Key,
                totalAllocated = g.Sum(x => x.a.AmountAllocated),
            })
            .OrderByDescending(x => x.totalAllocated)
            .ToList();

        // Recurring vs one-time
        var recurringCount = donationsQuery.Count(d => d.IsRecurring);
        var recurringAmount = donationsQuery
            .Where(d => d.IsRecurring && d.Amount.HasValue)
            .Sum(d => d.Amount) ?? 0;
        var oneTimeCount = donationsQuery.Count(d => !d.IsRecurring);
        var oneTimeAmount = donationsQuery
            .Where(d => !d.IsRecurring && d.Amount.HasValue)
            .Sum(d => d.Amount) ?? 0;

        return Ok(new
        {
            monthlyTotals,
            byType,
            byRegion,
            recurringVsOneTime = new { recurringCount, recurringAmount, oneTimeCount, oneTimeAmount },
        });
    }

    /// <summary>
    /// Resident outcomes: risk distributions, case categories, education/health trends.
    /// </summary>
    [HttpGet("ResidentOutcomes")]
    public IActionResult GetResidentOutcomes(string? region = null, int months = 12)
    {
        var cutoff = GetCutoff(months);
        var safehouseIds = FilteredSafehouses(region).Select(s => s.SafehouseId);

        var residentsQuery = _context.Residents
            .Where(r => safehouseIds.Contains(r.SafehouseId));

        // Risk distributions (active residents only)
        var activeResidents = residentsQuery.Where(r => r.CaseStatus == "Active");

        var initialRiskDistribution = activeResidents
            .GroupBy(r => r.InitialRiskLevel)
            .Select(g => new { riskLevel = g.Key, count = g.Count() })
            .OrderBy(x => x.riskLevel)
            .ToList();

        var currentRiskDistribution = activeResidents
            .GroupBy(r => r.CurrentRiskLevel)
            .Select(g => new { riskLevel = g.Key, count = g.Count() })
            .OrderBy(x => x.riskLevel)
            .ToList();

        // Case categories (active residents)
        var caseCategories = activeResidents
            .GroupBy(r => r.CaseCategory)
            .Select(g => new { category = g.Key, count = g.Count() })
            .OrderByDescending(x => x.count)
            .ToList();

        // Education progress over time from SafehouseMonthlyMetrics
        var metricsQuery = _context.SafehouseMonthlyMetrics
            .Where(m => safehouseIds.Contains(m.SafehouseId));
        if (cutoff.HasValue)
            metricsQuery = metricsQuery.Where(m => m.MonthStart >= cutoff.Value);

        var metricsRows = metricsQuery
            .Where(m => m.ActiveResidents > 0)
            .Select(m => new
            {
                m.MonthStart.Year,
                m.MonthStart.Month,
                m.AvgEducationProgress,
                m.AvgHealthScore,
                m.ActiveResidents,
            })
            .ToList();

        var monthlyEducationProgress = metricsRows
            .Where(m => m.AvgEducationProgress.HasValue)
            .GroupBy(m => new { m.Year, m.Month })
            .Select(g => new
            {
                month = $"{g.Key.Year}-{g.Key.Month:D2}",
                avgProgress = Math.Round(
                    g.Sum(m => m.AvgEducationProgress!.Value * m.ActiveResidents)
                    / g.Sum(m => m.ActiveResidents), 1),
            })
            .OrderBy(x => x.month)
            .ToList();

        var monthlyHealthScores = metricsRows
            .Where(m => m.AvgHealthScore.HasValue)
            .GroupBy(m => new { m.Year, m.Month })
            .Select(g => new
            {
                month = $"{g.Key.Year}-{g.Key.Month:D2}",
                avgScore = Math.Round(
                    g.Sum(m => m.AvgHealthScore!.Value * m.ActiveResidents)
                    / g.Sum(m => m.ActiveResidents), 1),
            })
            .OrderBy(x => x.month)
            .ToList();

        return Ok(new
        {
            initialRiskDistribution,
            currentRiskDistribution,
            caseCategories,
            monthlyEducationProgress,
            monthlyHealthScores,
        });
    }

    /// <summary>
    /// Safehouse performance comparisons from monthly metrics.
    /// </summary>
    [HttpGet("SafehousePerformance")]
    public IActionResult GetSafehousePerformance(string? region = null, int months = 12)
    {
        var cutoff = GetCutoff(months);
        var safehouseIds = FilteredSafehouses(region).Select(s => s.SafehouseId);

        var metricsQuery = _context.SafehouseMonthlyMetrics
            .Where(m => safehouseIds.Contains(m.SafehouseId));
        if (cutoff.HasValue)
            metricsQuery = metricsQuery.Where(m => m.MonthStart >= cutoff.Value);

        var safehouses = metricsQuery
            .GroupBy(m => m.SafehouseId)
            .Select(g => new
            {
                safehouseId = g.Key,
                avgEducationProgress = g.Where(m => m.AvgEducationProgress.HasValue)
                    .Average(m => m.AvgEducationProgress),
                avgHealthScore = g.Where(m => m.AvgHealthScore.HasValue)
                    .Average(m => m.AvgHealthScore),
                totalIncidents = g.Sum(m => m.IncidentCount),
                totalVisitations = g.Sum(m => m.HomeVisitationCount),
                totalProcessRecordings = g.Sum(m => m.ProcessRecordingCount),
                latestActiveResidents = g.OrderByDescending(m => m.MonthStart)
                    .Select(m => m.ActiveResidents)
                    .FirstOrDefault(),
            })
            .ToList();

        // Enrich with safehouse name and region
        var safehouseInfo = _context.Safehouses
            .Where(s => safehouseIds.Contains(s.SafehouseId))
            .ToDictionary(s => s.SafehouseId, s => new { s.Name, s.Region });

        var result = safehouses.Select(s => new
        {
            s.safehouseId,
            name = safehouseInfo.ContainsKey(s.safehouseId) ? safehouseInfo[s.safehouseId].Name : "Unknown",
            region = safehouseInfo.ContainsKey(s.safehouseId) ? safehouseInfo[s.safehouseId].Region : "Unknown",
            avgEducationProgress = s.avgEducationProgress.HasValue ? Math.Round(s.avgEducationProgress.Value, 1) : (decimal?)null,
            avgHealthScore = s.avgHealthScore.HasValue ? Math.Round(s.avgHealthScore.Value, 1) : (decimal?)null,
            s.totalIncidents,
            s.totalVisitations,
            s.totalProcessRecordings,
            s.latestActiveResidents,
        })
        .OrderBy(s => s.region)
        .ThenBy(s => s.name)
        .ToList();

        return Ok(new { safehouses = result });
    }

    /// <summary>
    /// Reintegration type/status breakdown and completion rates.
    /// </summary>
    [HttpGet("ReintegrationRates")]
    public IActionResult GetReintegrationRates(string? region = null, int months = 12)
    {
        var safehouseIds = FilteredSafehouses(region).Select(s => s.SafehouseId);

        var residentsQuery = _context.Residents
            .Where(r => safehouseIds.Contains(r.SafehouseId)
                        && r.ReintegrationType != null
                        && r.ReintegrationType != "None");

        // By type and status
        var byTypeAndStatus = residentsQuery
            .GroupBy(r => new { r.ReintegrationType, r.ReintegrationStatus })
            .Select(g => new
            {
                reintegrationType = g.Key.ReintegrationType,
                status = g.Key.ReintegrationStatus ?? "Unknown",
                count = g.Count(),
            })
            .OrderBy(x => x.reintegrationType)
            .ThenBy(x => x.status)
            .ToList();

        // Completion by region
        var completionByRegion = residentsQuery
            .Join(_context.Safehouses,
                r => r.SafehouseId,
                s => s.SafehouseId,
                (r, s) => new { r, s.Region })
            .GroupBy(x => x.Region)
            .Select(g => new
            {
                region = g.Key,
                total = g.Count(),
                completed = g.Count(x => x.r.ReintegrationStatus == "Completed"),
            })
            .ToList()
            .Select(g => new
            {
                g.region,
                g.total,
                g.completed,
                rate = g.total > 0 ? Math.Round((decimal)g.completed / g.total, 3) : 0,
            })
            .OrderBy(x => x.region)
            .ToList();

        // Overall rate
        var overallTotal = residentsQuery.Count();
        var overallCompleted = residentsQuery.Count(r => r.ReintegrationStatus == "Completed");

        return Ok(new
        {
            byTypeAndStatus,
            completionByRegion,
            overallRate = new
            {
                total = overallTotal,
                completed = overallCompleted,
                rate = overallTotal > 0 ? Math.Round((decimal)overallCompleted / overallTotal, 3) : 0,
            },
        });
    }
}
