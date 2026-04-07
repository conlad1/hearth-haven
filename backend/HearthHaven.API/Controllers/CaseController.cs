using HearthHaven.API.Data;
using Microsoft.AspNetCore.Mvc;

namespace HearthHaven.API.Controllers;


[Route("[controller]")]
[ApiController]
public class CaseController : ControllerBase
{
    private readonly HearthHavenDbContext _hearthHavenContext;

    public CaseController(HearthHavenDbContext temp) => _hearthHavenContext = temp;

    [HttpGet("AllCases")]
    public IActionResult GetCases(
        int page = 1,
        int pageSize = 20,
        int? safehouseId = null,
        string? caseStatus = null,
        string? caseCategory = null,
        string? sex = null,
        string? currentRiskLevel = null,
        string? referralSource = null,
        string? initialCaseAssessment = null,
        string? reintegrationType = null,
        string? assignedSocialWorker = null,
        string? search = null)
    {
        var query = _hearthHavenContext.Residents.AsQueryable();

        if (safehouseId.HasValue)
            query = query.Where(r => r.SafehouseId == safehouseId.Value);

        if (!string.IsNullOrWhiteSpace(caseStatus))
            query = query.Where(r => r.CaseStatus == caseStatus);

        if (!string.IsNullOrWhiteSpace(caseCategory))
            query = query.Where(r => r.CaseCategory == caseCategory);

        if (!string.IsNullOrWhiteSpace(sex))
            query = query.Where(r => r.Sex == sex);

        if (!string.IsNullOrWhiteSpace(currentRiskLevel))
            query = query.Where(r => r.CurrentRiskLevel == currentRiskLevel);

        if (!string.IsNullOrWhiteSpace(referralSource))
            query = query.Where(r => r.ReferralSource == referralSource);

        if (!string.IsNullOrWhiteSpace(initialCaseAssessment))
            query = query.Where(r => r.InitialCaseAssessment == initialCaseAssessment);

        if (!string.IsNullOrWhiteSpace(reintegrationType))
            query = query.Where(r => r.ReintegrationType == reintegrationType);

        if (!string.IsNullOrWhiteSpace(assignedSocialWorker))
            query = query.Where(r => r.AssignedSocialWorker == assignedSocialWorker);

        if (!string.IsNullOrWhiteSpace(search))
        {
            var term = search.ToLower();
            query = query.Where(r =>
                r.CaseControlNo.ToLower().Contains(term) ||
                r.InternalCode.ToLower().Contains(term) ||
                (r.AssignedSocialWorker != null && r.AssignedSocialWorker.ToLower().Contains(term)) ||
                (r.ReferringAgencyPerson != null && r.ReferringAgencyPerson.ToLower().Contains(term)) ||
                (r.PlaceOfBirth != null && r.PlaceOfBirth.ToLower().Contains(term))
            );
        }

        var totalCount = query.Count();

        var cases = query
            .OrderBy(x => x.ResidentId)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToList();

        return Ok(new
        {
            data = cases,
            totalCount,
            page,
            pageSize,
            totalPages = (int)Math.Ceiling(totalCount / (double)pageSize)
        });
    }

    [HttpGet("FilterOptions")]
    public IActionResult GetFilterOptions()
    {
        var options = new
        {
            caseStatuses = _hearthHavenContext.Residents
                .Select(r => r.CaseStatus).Distinct().OrderBy(s => s).ToList(),
            caseCategories = _hearthHavenContext.Residents
                .Select(r => r.CaseCategory).Distinct().OrderBy(s => s).ToList(),
            sexes = _hearthHavenContext.Residents
                .Select(r => r.Sex).Distinct().OrderBy(s => s).ToList(),
            riskLevels = _hearthHavenContext.Residents
                .Select(r => r.CurrentRiskLevel).Distinct().OrderBy(s => s).ToList(),
            referralSources = _hearthHavenContext.Residents
                .Select(r => r.ReferralSource).Distinct().OrderBy(s => s).ToList(),
            initialCaseAssessments = _hearthHavenContext.Residents
                .Where(r => r.InitialCaseAssessment != null)
                .Select(r => r.InitialCaseAssessment!).Distinct().OrderBy(s => s).ToList(),
            reintegrationTypes = _hearthHavenContext.Residents
                .Where(r => r.ReintegrationType != null)
                .Select(r => r.ReintegrationType!).Distinct().OrderBy(s => s).ToList(),
            socialWorkers = _hearthHavenContext.Residents
                .Where(r => r.AssignedSocialWorker != null)
                .Select(r => r.AssignedSocialWorker!).Distinct().OrderBy(s => s).ToList(),
            birthStatuses = _hearthHavenContext.Residents
                .Select(r => r.BirthStatus).Distinct().OrderBy(s => s).ToList(),
            religions = _hearthHavenContext.Residents
                .Where(r => r.Religion != null)
                .Select(r => r.Religion!).Distinct().OrderBy(s => s).ToList(),
            reintegrationStatuses = _hearthHavenContext.Residents
                .Where(r => r.ReintegrationStatus != null)
                .Select(r => r.ReintegrationStatus!).Distinct().OrderBy(s => s).ToList(),
            pwdTypes = _hearthHavenContext.Residents
                .Where(r => r.PwdType != null)
                .Select(r => r.PwdType!).Distinct().OrderBy(s => s).ToList(),
        };

        return Ok(options);
    }

    [HttpPost]
    public IActionResult CreateResident([FromBody] Resident resident)
    {
        _hearthHavenContext.Residents.Add(resident);
        _hearthHavenContext.SaveChanges();

        return CreatedAtAction(nameof(GetCases), new { id = resident.ResidentId }, resident);
    }

    [HttpPut("{id}")]
    public IActionResult UpdateResident(int id, [FromBody] Resident updated)
    {
        var resident = _hearthHavenContext.Residents.Find(id);
        if (resident == null) return NotFound();

        _hearthHavenContext.Entry(resident).CurrentValues.SetValues(updated);
        resident.ResidentId = id;
        _hearthHavenContext.SaveChanges();

        return Ok(resident);
    }

    [HttpDelete("{id}")]
    public IActionResult DeleteResident(int id)
    {
        var resident = _hearthHavenContext.Residents.Find(id);
        if (resident == null) return NotFound();

        _hearthHavenContext.Residents.Remove(resident);
        _hearthHavenContext.SaveChanges();

        return NoContent();
    }

    [HttpGet("Safehouses")]
    public IActionResult GetSafehouses()
    {
        var safehouses = _hearthHavenContext.Safehouses
            .OrderBy(s => s.Name)
            .Select(s => new { s.SafehouseId, s.Name })
            .ToList();

        return Ok(safehouses);
    }

}
