import { type ReactNode } from 'react';
import { X, ArrowRight, ShieldAlert, CheckCheck, AlertTriangle, CalendarClock, ExternalLink, TrendingUp, TrendingDown } from 'lucide-react';
import type {
  EscalatedResident,
  SafehouseOccupancyItem,
  CaseIncident,
  CaseManagerData,
} from '../../../api/admin/RoleDashboardAPI';
import type { TopReintegrationCandidate } from '../../../api/caseManager/MLResidentAPI';

// ── Generic modal shell ────────────────────────────────────────────────────────

export interface DetailModalProps {
  title: string;
  subtitle?: string;
  content: ReactNode;
  onClose: () => void;
}

export function DetailModal({ title, subtitle, content, onClose }: DetailModalProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div
        className="relative z-10 w-full max-w-lg rounded-2xl bg-white shadow-2xl dark:bg-gray-900"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-start justify-between border-b border-gray-100 px-6 py-4 dark:border-gray-800">
          <div>
            <h2 className="text-base font-bold text-gray-900 dark:text-white">{title}</h2>
            {subtitle && (
              <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">{subtitle}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="ml-4 shrink-0 rounded-lg p-1.5 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-300"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="max-h-[70vh] overflow-y-auto px-6 py-4">
          {content}
        </div>
      </div>
    </div>
  );
}

// ── Shared helpers ─────────────────────────────────────────────────────────────

function riskBadge(level: string) {
  const s = level.toLowerCase();
  if (s === 'critical') return 'bg-red-100 dark:bg-red-500/10 text-red-700 dark:text-red-400';
  if (s === 'high')     return 'bg-orange-100 dark:bg-orange-500/10 text-orange-700 dark:text-orange-400';
  if (s === 'medium')   return 'bg-yellow-100 dark:bg-yellow-500/10 text-yellow-700 dark:text-yellow-400';
  return 'bg-green-100 dark:bg-green-500/10 text-green-700 dark:text-green-400';
}

function severityBadge(s: string) {
  const v = s.toLowerCase();
  if (v === 'high')   return 'bg-red-100 dark:bg-red-500/10 text-red-700 dark:text-red-400';
  if (v === 'medium') return 'bg-yellow-100 dark:bg-yellow-500/10 text-yellow-700 dark:text-yellow-400';
  return 'bg-green-100 dark:bg-green-500/10 text-green-700 dark:text-green-400';
}

// ── Triage: High / Critical Risk ──────────────────────────────────────────────

interface TriageHighRiskContentProps {
  caseData: CaseManagerData;
  onNavigate: (path: string) => void;
}

export function TriageHighRiskContent({ caseData, onNavigate }: TriageHighRiskContentProps) {
  const highRisk = caseData.escalatedResidents.filter(
    r => r.currentRiskLevel === 'High' || r.currentRiskLevel === 'Critical',
  );

  return (
    <div className="space-y-3">
      <p className="text-xs text-gray-500 dark:text-gray-400">
        Residents currently assessed at High or Critical risk level.
      </p>
      {highRisk.length === 0 ? (
        <div className="flex items-center gap-2 rounded-lg bg-green-50 px-3 py-3 dark:bg-green-500/10">
          <CheckCheck className="h-4 w-4 text-green-500 shrink-0" />
          <p className="text-sm text-green-700 dark:text-green-400">No residents at high or critical risk.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {highRisk.map(r => (
            <div
              key={r.residentId}
              className="flex cursor-pointer items-center justify-between rounded-lg border border-gray-100 dark:border-gray-700 px-3 py-2.5 transition hover:bg-gray-50 dark:hover:bg-gray-800"
              onClick={() => onNavigate(`/cases/${r.residentId}`)}
            >
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium text-gray-900 dark:text-white">{r.caseControlNo}</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">{r.safehouseName ?? 'Unknown safehouse'}</div>
              </div>
              <div className="flex items-center gap-2 ml-3 shrink-0">
                <span className={`badge ${riskBadge(r.initialRiskLevel)}`}>{r.initialRiskLevel}</span>
                <ArrowRight className="h-3 w-3 text-gray-400" />
                <span className={`badge ${riskBadge(r.currentRiskLevel)}`}>{r.currentRiskLevel}</span>
              </div>
            </div>
          ))}
        </div>
      )}
      <button
        onClick={() => onNavigate('/cases')}
        className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-lg border border-gray-200 dark:border-gray-700 px-3 py-2 text-sm text-gray-600 dark:text-gray-400 transition hover:bg-gray-50 dark:hover:bg-gray-800"
      >
        View all cases <ExternalLink className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

// ── Triage: Unresolved Incidents ──────────────────────────────────────────────

interface TriageIncidentsContentProps {
  caseData: CaseManagerData;
  onNavigate: (path: string, state?: object) => void;
}

export function TriageIncidentsContent({ caseData, onNavigate }: TriageIncidentsContentProps) {
  const unresolved = caseData.recentIncidents.filter(i => !i.resolved);

  return (
    <div className="space-y-3">
      <p className="text-xs text-gray-500 dark:text-gray-400">
        Open incidents requiring follow-up or resolution.
      </p>
      {unresolved.length === 0 ? (
        <div className="flex items-center gap-2 rounded-lg bg-green-50 px-3 py-3 dark:bg-green-500/10">
          <CheckCheck className="h-4 w-4 text-green-500 shrink-0" />
          <p className="text-sm text-green-700 dark:text-green-400">All recent incidents have been resolved.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {unresolved.map(i => (
            <div
              key={i.incidentId}
              className="flex cursor-pointer items-center justify-between rounded-lg border border-gray-100 dark:border-gray-700 px-3 py-2.5 transition hover:bg-gray-50 dark:hover:bg-gray-800"
              onClick={() => onNavigate(`/cases/${i.residentId}`, { tab: 'safety' })}
            >
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium text-gray-900 dark:text-white">{i.incidentType}</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  {i.residentCode ?? 'Unknown'} · {i.safehouseName ?? ''} · {i.incidentDate}
                </div>
              </div>
              <span className={`ml-3 shrink-0 badge ${severityBadge(i.severity)}`}>{i.severity}</span>
            </div>
          ))}
        </div>
      )}
      <button
        onClick={() => onNavigate('/cases')}
        className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-lg border border-gray-200 dark:border-gray-700 px-3 py-2 text-sm text-gray-600 dark:text-gray-400 transition hover:bg-gray-50 dark:hover:bg-gray-800"
      >
        View all cases <ExternalLink className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

// ── Triage: Flagged Sessions ───────────────────────────────────────────────────

interface TriageFlaggedContentProps {
  count: number;
  onNavigate: (path: string) => void;
}

export function TriageFlaggedContent({ count, onNavigate }: TriageFlaggedContentProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 rounded-xl bg-orange-50 px-4 py-4 dark:bg-orange-500/10">
        <AlertTriangle className="h-6 w-6 shrink-0 text-orange-500" />
        <div>
          <div className="text-2xl font-bold text-orange-700 dark:text-orange-400">{count}</div>
          <div className="text-xs text-orange-600 dark:text-orange-400">session{count !== 1 ? 's' : ''} flagged for concern</div>
        </div>
      </div>
      <p className="text-xs text-gray-500 dark:text-gray-400">
        Sessions marked with safety concerns during counsellor review. Each flagged session should be reviewed and addressed.
      </p>
      <button
        onClick={() => onNavigate('/cases')}
        className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-gray-200 dark:border-gray-700 px-3 py-2 text-sm text-gray-600 dark:text-gray-400 transition hover:bg-gray-50 dark:hover:bg-gray-800"
      >
        Review in Case Management <ExternalLink className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

// ── Triage: Upcoming Conferences ──────────────────────────────────────────────

interface TriageConferencesContentProps {
  count: number;
  onNavigate: (path: string) => void;
}

export function TriageConferencesContent({ count, onNavigate }: TriageConferencesContentProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 rounded-xl bg-purple-50 px-4 py-4 dark:bg-purple-500/10">
        <CalendarClock className="h-6 w-6 shrink-0 text-purple-500" />
        <div>
          <div className="text-2xl font-bold text-purple-700 dark:text-purple-400">{count}</div>
          <div className="text-xs text-purple-600 dark:text-purple-400">conference{count !== 1 ? 's' : ''} scheduled</div>
        </div>
      </div>
      <p className="text-xs text-gray-500 dark:text-gray-400">
        Case conferences scheduled in the next 30 days. Ensure all relevant stakeholders are notified and case files are up to date.
      </p>
      <button
        onClick={() => onNavigate('/cases')}
        className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-gray-200 dark:border-gray-700 px-3 py-2 text-sm text-gray-600 dark:text-gray-400 transition hover:bg-gray-50 dark:hover:bg-gray-800"
      >
        View all cases <ExternalLink className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

// ── Escalated Resident Detail ─────────────────────────────────────────────────

interface EscalatedResidentContentProps {
  resident: EscalatedResident;
  onNavigate: (path: string) => void;
}

export function EscalatedResidentContent({ resident, onNavigate }: EscalatedResidentContentProps) {
  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 dark:border-red-500/20 dark:bg-red-500/10">
        <div className="flex items-center gap-2">
          <ShieldAlert className="h-4 w-4 shrink-0 text-red-500" />
          <span className="text-sm font-semibold text-red-700 dark:text-red-400">Risk escalation detected</span>
        </div>
        <div className="mt-2 flex items-center gap-3">
          <span className={`badge ${riskBadge(resident.initialRiskLevel)}`}>{resident.initialRiskLevel}</span>
          <ArrowRight className="h-4 w-4 text-gray-400" />
          <span className={`badge ${riskBadge(resident.currentRiskLevel)}`}>{resident.currentRiskLevel}</span>
        </div>
      </div>
      <div className="space-y-2 text-sm">
        <div className="flex items-center justify-between">
          <span className="text-gray-500 dark:text-gray-400">Case Control No.</span>
          <span className="font-medium text-gray-900 dark:text-white">{resident.caseControlNo}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-gray-500 dark:text-gray-400">Safehouse</span>
          <span className="font-medium text-gray-900 dark:text-white">{resident.safehouseName ?? '—'}</span>
        </div>
      </div>
      <button
        onClick={() => onNavigate(`/cases/${resident.residentId}`)}
        className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-orange-500 px-3 py-2 text-sm font-medium text-white transition hover:bg-orange-600"
      >
        Open full case file <ExternalLink className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

// ── Reintegration Candidate Detail ────────────────────────────────────────────

interface ReintegCandidateContentProps {
  candidate: TopReintegrationCandidate;
  onNavigate: (path: string) => void;
}

export function ReintegCandidateContent({ candidate, onNavigate }: ReintegCandidateContentProps) {
  const score = candidate.readinessScore;
  const barColor = score >= 70 ? 'bg-emerald-500' : score >= 40 ? 'bg-yellow-500' : 'bg-red-500';

  return (
    <div className="space-y-4">
      <div>
        <div className="mb-1.5 flex items-center justify-between text-sm">
          <span className="text-gray-500 dark:text-gray-400">ML Readiness Score</span>
          <span className="font-bold text-gray-900 dark:text-white">{score.toFixed(0)}%</span>
        </div>
        <div className="h-2.5 w-full rounded-full bg-gray-100 dark:bg-gray-700">
          <div className={`h-2.5 rounded-full ${barColor} transition-all`} style={{ width: `${score}%` }} />
        </div>
        <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
          {candidate.prediction.recommendation === 'Likely Reintegrated'
            ? 'High likelihood of successful reintegration'
            : candidate.prediction.recommendation === 'Not Yet Ready'
            ? 'Not yet ready — further preparation recommended'
            : candidate.prediction.recommendation}
        </p>
      </div>
      <div className="space-y-2 text-sm">
        <div className="flex items-center justify-between">
          <span className="text-gray-500 dark:text-gray-400">Case Control No.</span>
          <span className="font-medium text-gray-900 dark:text-white">{candidate.caseControlNo}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-gray-500 dark:text-gray-400">Case Category</span>
          <span className="font-medium text-gray-900 dark:text-white">{candidate.caseCategory}</span>
        </div>
        {candidate.safehouseName && (
          <div className="flex items-center justify-between">
            <span className="text-gray-500 dark:text-gray-400">Safehouse</span>
            <span className="font-medium text-gray-900 dark:text-white">{candidate.safehouseName}</span>
          </div>
        )}
        {candidate.assignedSocialWorker && (
          <div className="flex items-center justify-between">
            <span className="text-gray-500 dark:text-gray-400">Social Worker</span>
            <span className="font-medium text-gray-900 dark:text-white">{candidate.assignedSocialWorker}</span>
          </div>
        )}
      </div>
      <button
        onClick={() => onNavigate(`/cases/${candidate.residentId}`)}
        className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-emerald-700"
      >
        Open full case file <ExternalLink className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

// ── Safehouse Occupancy Detail ────────────────────────────────────────────────

interface SafehouseDetailContentProps {
  safehouse: SafehouseOccupancyItem;
  onNavigate: (path: string) => void;
}

export function SafehouseDetailContent({ safehouse, onNavigate }: SafehouseDetailContentProps) {
  const pct = safehouse.capacityGirls > 0
    ? Math.round(safehouse.activeResidents / safehouse.capacityGirls * 100)
    : 0;
  const barColor = pct >= 90 ? 'bg-red-500' : pct >= 70 ? 'bg-yellow-500' : 'bg-emerald-500';
  const statusLabel = pct >= 90 ? 'Near capacity' : pct >= 70 ? 'Approaching capacity' : 'Healthy occupancy';

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-500 dark:text-gray-400">Occupancy</span>
          <span className="font-bold text-gray-900 dark:text-white">
            {safehouse.activeResidents} / {safehouse.capacityGirls} ({pct}%)
          </span>
        </div>
        <div className="h-3 w-full rounded-full bg-gray-100 dark:bg-gray-700">
          <div className={`h-3 rounded-full ${barColor} transition-all`} style={{ width: `${Math.min(pct, 100)}%` }} />
        </div>
        <p className={`text-xs font-medium ${pct >= 90 ? 'text-red-500' : pct >= 70 ? 'text-yellow-600' : 'text-emerald-600'}`}>
          {statusLabel}
        </p>
      </div>
      <div className="space-y-2 text-sm">
        <div className="flex items-center justify-between">
          <span className="text-gray-500 dark:text-gray-400">Region</span>
          <span className="font-medium text-gray-900 dark:text-white">{safehouse.region}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-gray-500 dark:text-gray-400">Capacity</span>
          <span className="font-medium text-gray-900 dark:text-white">{safehouse.capacityGirls} beds</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-gray-500 dark:text-gray-400">Available beds</span>
          <span className="font-medium text-gray-900 dark:text-white">
            {Math.max(0, safehouse.capacityGirls - safehouse.activeResidents)}
          </span>
        </div>
      </div>
      <button
        onClick={() => onNavigate(`/safehouse-management/safehouses/${safehouse.safehouseId}`)}
        className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-blue-700"
      >
        Manage safehouse <ExternalLink className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

// ── Incident Detail ───────────────────────────────────────────────────────────

interface IncidentDetailContentProps {
  incident: CaseIncident;
  onNavigate: (path: string, state?: object) => void;
}

export function IncidentDetailContent({ incident, onNavigate }: IncidentDetailContentProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <span className={`badge text-sm px-3 py-1 ${severityBadge(incident.severity)}`}>{incident.severity} severity</span>
        {!incident.resolved && (
          <span className="badge bg-red-100 dark:bg-red-500/10 text-red-700 dark:text-red-400">Open</span>
        )}
        {incident.resolved && (
          <span className="badge bg-green-100 dark:bg-green-500/10 text-green-700 dark:text-green-400">Resolved</span>
        )}
      </div>
      <div className="space-y-2 text-sm">
        <div className="flex items-start justify-between gap-4">
          <span className="text-gray-500 dark:text-gray-400">Type</span>
          <span className="font-medium text-gray-900 dark:text-white text-right">{incident.incidentType}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-gray-500 dark:text-gray-400">Date</span>
          <span className="font-medium text-gray-900 dark:text-white">{incident.incidentDate}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-gray-500 dark:text-gray-400">Resident code</span>
          <span className="font-medium text-gray-900 dark:text-white">{incident.residentCode ?? '—'}</span>
        </div>
        {incident.safehouseName && (
          <div className="flex items-center justify-between">
            <span className="text-gray-500 dark:text-gray-400">Safehouse</span>
            <span className="font-medium text-gray-900 dark:text-white">{incident.safehouseName}</span>
          </div>
        )}
        <div className="flex items-center justify-between">
          <span className="text-gray-500 dark:text-gray-400">Reported by</span>
          <span className="font-medium text-gray-900 dark:text-white">{incident.reportedBy}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-gray-500 dark:text-gray-400">Follow-up required</span>
          <span className={`font-medium ${incident.followUpRequired ? 'text-yellow-600 dark:text-yellow-400' : 'text-green-600 dark:text-green-400'}`}>
            {incident.followUpRequired ? 'Yes' : 'No'}
          </span>
        </div>
      </div>
      <button
        onClick={() => onNavigate(`/cases/${incident.residentId}`, { tab: 'safety' })}
        className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-orange-500 px-3 py-2 text-sm font-medium text-white transition hover:bg-orange-600"
      >
        View resident case file <ExternalLink className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

// ── Risk Driver Detail ────────────────────────────────────────────────────────

const riskDriverInterpretations: Record<string, string> = {
  'Safety concerns flagged in sessions': 'Residents with flagged safety concerns in their session history show significantly elevated risk levels. Prioritise reviewing and addressing flagged sessions promptly.',
  'No religious affiliation recorded': 'Residents without a recorded religious affiliation trend toward higher predicted risk. Consider exploring spiritual support as part of the care plan.',
  'Planned for Independent Living': 'Having an independent living plan is associated with lower current risk. This likely reflects both lower baseline vulnerability and active progress toward reintegration.',
  'Planned for Family Reunification': 'Family reunification plans correlate with reduced risk scores, suggesting these residents have stronger support networks and more stable pathways.',
  'No reintegration plan yet': 'Absence of a reintegration plan is associated with lower current risk in this model, possibly reflecting newer admissions or different case profiles.',
  'Planned for Foster Care': 'Foster care placement correlates with reduced current risk, indicating stable interim living arrangements.',
  'Resident age': 'Age is a moderate predictor — risk profiles shift across age groups. Review age-specific vulnerabilities when building care plans.',
  'Number of children': 'Having children adds complexity to a resident\'s situation and influences the overall risk assessment.',
  'Currently employed': 'Employment is associated with reduced risk, reflecting financial stability and social engagement.',
  'Currently unemployed': 'Unemployment correlates with elevated risk, often linked to financial stress and reduced independence.',
  'Substance abuse history recorded': 'Prior substance abuse is a significant predictor of higher current risk. Ensure dedicated support is in place.',
  'Mental health history recorded': 'Mental health history is associated with higher predicted risk. Regular mental health monitoring is recommended.',
  'Physical trauma documented': 'Documented physical trauma is a key risk predictor. Trauma-informed care approaches are essential.',
  'Emotional trauma documented': 'Emotional trauma history is associated with elevated risk. Therapeutic support should be a priority.',
  'Sexual trauma documented': 'Sexual trauma is a significant risk predictor. Specialised trauma-informed care and counselling are critical.',
  'Legal case ongoing': 'Active legal proceedings are associated with higher risk levels, likely due to sustained stress and uncertainty.',
  'Legal case closed': 'A closed legal case correlates with lower risk, reflecting resolution and reduced ongoing stress.',
};

interface RiskDriverDetailContentProps {
  label: string;
  coefficient: number;
  significant: string;
}

export function RiskDriverDetailContent({ label, coefficient, significant }: RiskDriverDetailContentProps) {
  const isPositive = coefficient > 0;
  const interpretation = riskDriverInterpretations[label]
    ?? (isPositive
      ? 'This factor is associated with elevated resident risk in the causal model. Review case records for residents with this characteristic.'
      : 'This factor is associated with reduced resident risk in the causal model. It may be protective and worth supporting.');

  return (
    <div className="space-y-4">
      <div className={`flex items-center gap-3 rounded-xl px-4 py-3 ${isPositive ? 'bg-red-50 dark:bg-red-500/10' : 'bg-green-50 dark:bg-green-500/10'}`}>
        {isPositive
          ? <TrendingUp className="h-5 w-5 shrink-0 text-red-500" />
          : <TrendingDown className="h-5 w-5 shrink-0 text-green-500" />}
        <div>
          <div className={`text-xs font-medium ${isPositive ? 'text-red-600 dark:text-red-400' : 'text-green-700 dark:text-green-400'}`}>
            {isPositive ? 'Increases risk' : 'Decreases risk'}
          </div>
          <div className="mt-0.5 flex items-center gap-2">
            <span className={`font-mono text-lg font-bold ${isPositive ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
              {isPositive ? '+' : ''}{coefficient.toFixed(3)}
            </span>
            {significant && significant !== '(ns)' && (
              <span className="rounded bg-gray-100 px-1.5 py-0.5 text-xs font-mono text-gray-600 dark:bg-gray-800 dark:text-gray-400">
                {significant}
              </span>
            )}
          </div>
        </div>
      </div>
      <div className="space-y-1 text-sm">
        <p className="font-medium text-gray-700 dark:text-gray-300">What this means</p>
        <p className="text-gray-500 dark:text-gray-400 leading-relaxed">{interpretation}</p>
      </div>
      <div className="rounded-lg border border-gray-100 dark:border-gray-700 px-3 py-2.5 text-xs text-gray-400 dark:text-gray-500">
        OLS regression · coefficient = change in risk score per unit of this variable ·{' '}
        {significant === '(ns)' || !significant ? 'not statistically significant' : significant === '*' ? 'p < 0.05' : significant === '**' ? 'p < 0.01' : significant}
      </div>
    </div>
  );
}

// ── Intervention Factor Detail ────────────────────────────────────────────────

interface InterventionFactorContentProps {
  label: string;
  coefficient: number;
  significant: string;
  direction: 'positive' | 'negative';
}

export function InterventionFactorContent({ label, coefficient, significant, direction }: InterventionFactorContentProps) {
  const isPositive = direction === 'positive';

  return (
    <div className="space-y-4">
      <div className={`flex items-center gap-3 rounded-xl px-4 py-3 ${isPositive ? 'bg-green-50 dark:bg-green-500/10' : 'bg-red-50 dark:bg-red-500/10'}`}>
        {isPositive
          ? <TrendingUp className="h-5 w-5 shrink-0 text-green-500" />
          : <TrendingDown className="h-5 w-5 shrink-0 text-red-500" />}
        <div>
          <div className={`text-xs font-medium ${isPositive ? 'text-green-700 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
            {isPositive ? 'Positive factor' : 'Negative factor'}
          </div>
          <div className="mt-0.5 flex items-center gap-2">
            <span className={`font-mono text-lg font-bold ${isPositive ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
              {isPositive ? '+' : ''}{coefficient.toFixed(1)}
            </span>
            {significant && significant !== '(ns)' && (
              <span className="rounded bg-gray-100 px-1.5 py-0.5 text-xs font-mono text-gray-600 dark:bg-gray-800 dark:text-gray-400">
                {significant}
              </span>
            )}
          </div>
        </div>
      </div>
      <div className="space-y-1 text-sm">
        <p className="font-medium text-gray-700 dark:text-gray-300">What this means</p>
        <p className="text-gray-500 dark:text-gray-400 leading-relaxed">
          {isPositive
            ? `When "${label}" is present, intervention effectiveness scores are higher by approximately ${coefficient.toFixed(0)} points. This factor is associated with better intervention outcomes.`
            : `When "${label}" is present, intervention effectiveness scores are lower by approximately ${Math.abs(coefficient).toFixed(0)} points. This factor may signal cases requiring more intensive or alternative intervention strategies.`}
        </p>
      </div>
      <div className="rounded-lg border border-gray-100 dark:border-gray-700 px-3 py-2.5 text-xs text-gray-400 dark:text-gray-500">
        OLS regression · coefficient = estimated change in effectiveness score ·{' '}
        {significant === '(ns)' || !significant ? 'not statistically significant' : significant === '*' ? 'p < 0.05' : significant === '**' ? 'p < 0.01' : significant}
      </div>
    </div>
  );
}
