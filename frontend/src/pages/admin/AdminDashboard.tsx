import { useEffect, useRef, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuthSession } from '../../authSession';
import { AppRoles, getCurrentRole } from '../../authz';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  type ChartOptions,
} from 'chart.js';
import { Bar, Line } from 'react-chartjs-2';
import {
  Users, Banknote, ShieldAlert, AlertTriangle,
  CalendarClock, MessageCircleWarning, ArrowRight,
  TrendingUp, TrendingDown, CheckCheck, Brain, Heart, BookOpen,
  Megaphone, Mail, ExternalLink, Plus, ChevronDown, FlaskConical,
} from 'lucide-react';
import {
  fetchTopStats, fetchCaseManager, fetchCaseAnalytics,
  fetchDonorManager, fetchDonorAllocations, createAllocation,
  fetchSocialMediaManager, fetchRiskDrivers, fetchPostingDrivers,
  type DashboardTopStats, type CaseManagerData, type CaseAnalyticsData,
  type DonorManagerData, type DonorAllocationsData, type SocialMediaManagerData,
  type RiskDriver, type PostingStrategyDrivers,
} from '../../api/admin/RoleDashboardAPI';
import {
  fetchTopReintegrationCandidates,
  type TopReintegrationCandidate,
} from '../../api/caseManager/MLResidentAPI';
import {
  fetchTopLapseRiskDonors, fetchTopUpgradePotentialDonors,
  type TopLapseRiskDonor, type TopUpgradePotentialDonor,
} from '../../api/donationManager/MLDonorAPI';
import { fetchMonthlyDonationForecast, type MonthlyDonationForecast } from '../../api/socialsManager/MLSocialAPI';
import {
  DetailModal,
  TriageHighRiskContent, TriageIncidentsContent,
  TriageFlaggedContent, TriageConferencesContent,
  EscalatedResidentContent, ReintegCandidateContent,
  SafehouseDetailContent, IncidentDetailContent,
  RiskDriverDetailContent, InterventionFactorContent,
} from '../../components/admin/dashboard/DetailModal';
import type { EscalatedResident, SafehouseOccupancyItem, CaseIncident } from '../../api/admin/RoleDashboardAPI';

type ActiveModal =
  | { type: 'triage-highrisk' }
  | { type: 'triage-incidents' }
  | { type: 'triage-flagged' }
  | { type: 'triage-conferences' }
  | { type: 'resident'; resident: EscalatedResident }
  | { type: 'reintegration'; candidate: TopReintegrationCandidate }
  | { type: 'safehouse'; safehouse: SafehouseOccupancyItem }
  | { type: 'incident'; incident: CaseIncident }
  | { type: 'risk-driver'; label: string; coefficient: number; significant: string }
  | { type: 'intervention-factor'; label: string; coefficient: number; significant: string; direction: 'positive' | 'negative' };

ChartJS.register(
  CategoryScale, LinearScale, BarElement,
  PointElement, LineElement, Title, Tooltip, Legend,
);

// ── Colour helpers ─────────────────────────────────────────────────────────────

function riskColor(level: string) {
  const s = level.toLowerCase();
  if (s === 'critical') return 'bg-red-100 dark:bg-red-500/10 text-red-700 dark:text-red-400';
  if (s === 'high')     return 'bg-orange-100 dark:bg-orange-500/10 text-orange-700 dark:text-orange-400';
  if (s === 'medium')   return 'bg-yellow-100 dark:bg-yellow-500/10 text-yellow-700 dark:text-yellow-400';
  return 'bg-green-100 dark:bg-green-500/10 text-green-700 dark:text-green-400';
}

function severityColor(s: string) {
  const v = s.toLowerCase();
  if (v === 'high')   return 'bg-red-100 dark:bg-red-500/10 text-red-700 dark:text-red-400';
  if (v === 'medium') return 'bg-yellow-100 dark:bg-yellow-500/10 text-yellow-700 dark:text-yellow-400';
  return 'bg-green-100 dark:bg-green-500/10 text-green-700 dark:text-green-400';
}

function scoreColor(score: number) {
  if (score >= 70) return 'bg-red-100 dark:bg-red-500/10 text-red-700 dark:text-red-400';
  if (score >= 40) return 'bg-yellow-100 dark:bg-yellow-500/10 text-yellow-700 dark:text-yellow-400';
  return 'bg-green-100 dark:bg-green-500/10 text-green-700 dark:text-green-400';
}

function upgradeScoreColor(score: number) {
  if (score >= 70) return 'bg-emerald-100 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400';
  if (score >= 40) return 'bg-blue-100 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400';
  return 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400';
}

// ── Number formatters ──────────────────────────────────────────────────────────

function fmtUSD(n: number) {
  return '$' + Number(n).toLocaleString('en-US', { minimumFractionDigits: 0 });
}

function fmtPct(n: number) {
  return n.toFixed(1) + '%';
}

// ── Shared sub-components ─────────────────────────────────────────────────────

function DriverBar({ label, coefficient, max, positive }: {
  label: string; coefficient: number; max: number; positive: boolean;
}) {
  const pct = max > 0 ? Math.abs(coefficient) / max * 100 : 0;
  const color = positive
    ? 'bg-orange-500 dark:bg-orange-400'
    : 'bg-blue-500 dark:bg-blue-400';
  const sign = coefficient >= 0 ? '+' : '';
  return (
    <div>
      <div className="mb-1 flex items-center justify-between">
        <span className="text-xs text-gray-700 dark:text-gray-300 truncate max-w-[70%]">{label}</span>
        <span className="text-xs font-mono text-gray-500 dark:text-gray-400">{sign}{coefficient.toFixed(3)}</span>
      </div>
      <div className="h-2 w-full rounded-full bg-gray-100 dark:bg-gray-700">
        <div className={`h-2 rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

// ── Shared chart options ───────────────────────────────────────────────────────

const baseBarOpts: ChartOptions<'bar'> = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
    tooltip: {
      backgroundColor: '#1c1917',
      titleColor: '#f9fafb',
      bodyColor: '#d1d5db',
      borderColor: 'rgba(249,115,22,0.3)',
      borderWidth: 1,
      padding: 10,
    },
  },
  scales: {
    x: { grid: { display: false }, ticks: { color: '#9ca3af' } },
    y: { beginAtZero: true, grid: { color: 'rgba(156,163,175,0.1)' }, ticks: { color: '#9ca3af' } },
  },
};

const baseLineOpts: ChartOptions<'line'> = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
    tooltip: {
      backgroundColor: '#1c1917',
      titleColor: '#f9fafb',
      bodyColor: '#d1d5db',
      borderColor: 'rgba(249,115,22,0.3)',
      borderWidth: 1,
      padding: 10,
    },
  },
  scales: {
    x: { grid: { display: false }, ticks: { color: '#9ca3af' } },
    y: { beginAtZero: true, grid: { color: 'rgba(156,163,175,0.1)' }, ticks: { color: '#9ca3af' } },
  },
};

const healthLineOpts: ChartOptions<'line'> = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
    tooltip: {
      backgroundColor: '#1c1917',
      titleColor: '#f9fafb',
      bodyColor: '#d1d5db',
      borderColor: 'rgba(59,130,246,0.3)',
      borderWidth: 1,
      padding: 10,
    },
  },
  scales: {
    x: { grid: { display: false }, ticks: { color: '#9ca3af' } },
    y: {
      min: 1,
      max: 5,
      grid: { color: 'rgba(156,163,175,0.1)' },
      ticks: { color: '#9ca3af', stepSize: 1 },
    },
  },
};


// ── Inline skeleton ────────────────────────────────────────────────────────────

function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded bg-gray-200 dark:bg-gray-700 ${className ?? ''}`} />;
}

function CardSkeleton() {
  return (
    <div className="card p-5 space-y-3">
      <Skeleton className="h-4 w-32" />
      <Skeleton className="h-8 w-20" />
      <Skeleton className="h-3 w-24" />
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

type Tab = 'case' | 'donor' | 'social';

const roleTabMap: Partial<Record<string, Tab>> = {
  [AppRoles.CaseManager]:     'case',
  [AppRoles.DonationsManager]: 'donor',
  [AppRoles.OutreachManager]: 'social',
};

export default function AdminDashboard() {
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser } = useAuthSession();
  const role = getCurrentRole(currentUser);
  const defaultTab: Tab = (location.state as { dashboardTab?: Tab })?.dashboardTab ?? (role && roleTabMap[role]) ?? 'case';
  const [activeTab, setActiveTab] = useState<Tab>(defaultTab);
  const [activeModal, setActiveModal] = useState<ActiveModal | null>(null);

  // Top stats (always loaded)
  const [topStats, setTopStats]       = useState<DashboardTopStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);

  // Case tab
  const [caseData, setCaseData]           = useState<CaseManagerData | null>(null);
  const [caseAnalytics, setCaseAnalytics] = useState<CaseAnalyticsData | null>(null);
  const [reintegCands, setReintegCands]   = useState<TopReintegrationCandidate[] | null>(null);
  const [riskDrivers, setRiskDrivers]           = useState<RiskDriver[] | null>(null);
  const [interventionCoefs, setInterventionCoefs] = useState<RiskDriver[] | null>(null);
  const [caseLoading, setCaseLoading]           = useState(false);
  const [caseError, setCaseError]         = useState<string | null>(null);

  // Donor tab
  const [donorData, setDonorData]         = useState<DonorManagerData | null>(null);
  const [allocData, setAllocData]         = useState<DonorAllocationsData | null>(null);
  const [lapseRisk, setLapseRisk]         = useState<TopLapseRiskDonor[] | null>(null);
  const [upgradeCands, setUpgradeCands]   = useState<TopUpgradePotentialDonor[] | null>(null);
  const [donorLoading, setDonorLoading]   = useState(false);
  const [donorError, setDonorError]       = useState<string | null>(null);

  // Social tab
  const [socialData, setSocialData]       = useState<SocialMediaManagerData | null>(null);
  const [postingDrivers, setPostingDrivers] = useState<PostingStrategyDrivers | null>(null);
  const [mlForecast, setMlForecast]       = useState<MonthlyDonationForecast | null>(null);
  const [socialLoading, setSocialLoading] = useState(false);
  const [socialError, setSocialError]     = useState<string | null>(null);

  // Track which tabs have been loaded
  const loadedTabs = useRef<Set<Tab>>(new Set());

  // ── Load top stats once ──────────────────────────────────────────────────────
  useEffect(() => {
    fetchTopStats()
      .then(setTopStats)
      .catch(() => setTopStats(null))
      .finally(() => setStatsLoading(false));
  }, []);

  // ── Load tab data on first visit ────────────────────────────────────────────
  useEffect(() => {
    if (loadedTabs.current.has(activeTab)) return;
    loadedTabs.current.add(activeTab);

    if (activeTab === 'case') {
      setCaseLoading(true);
      const parseCoefCsv = (text: string): RiskDriver[] =>
        text.trim().split('\n').slice(1).map(line => {
          const [feature, coefficient, , , , , significant] = line.split(',');
          return { feature, coefficient: parseFloat(coefficient), significant: significant?.trim() ?? '' };
        });

      Promise.all([
        fetchCaseManager(),
        fetchCaseAnalytics(),
        fetchTopReintegrationCandidates(8),
        fetchRiskDrivers(),
        fetch('/causal/intervention_effectiveness_coefficients.csv').then(r => r.text()).then(parseCoefCsv).catch(() => null),
      ])
        .then(([cm, ca, rc, rd, ic]) => {
          setCaseData(cm);
          setCaseAnalytics(ca);
          setReintegCands(rc);
          setRiskDrivers(rd);
          if (ic) setInterventionCoefs(ic);
        })
        .catch((err) => setCaseError(err.message))
        .finally(() => setCaseLoading(false));
    }

    if (activeTab === 'donor') {
      setDonorLoading(true);
      Promise.all([
        fetchDonorManager(),
        fetchDonorAllocations(),
        fetchTopLapseRiskDonors(8),
        fetchTopUpgradePotentialDonors(8),
      ])
        .then(([dm, ad, lr, uc]) => {
          setDonorData(dm);
          setAllocData(ad);
          setLapseRisk(lr);
          setUpgradeCands(uc);
        })
        .catch((err) => setDonorError(err.message))
        .finally(() => setDonorLoading(false));
    }

    if (activeTab === 'social') {
      setSocialLoading(true);
      const nextMonth = (() => {
        const d = new Date();
        d.setMonth(d.getMonth() + 1);
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      })();
      Promise.all([
        fetchSocialMediaManager(),
        fetchPostingDrivers(),
        fetchMonthlyDonationForecast(nextMonth),
      ])
        .then(([sm, pd, mf]) => {
          setSocialData(sm);
          setPostingDrivers(pd);
          setMlForecast(mf);
        })
        .catch((err) => setSocialError(err.message))
        .finally(() => setSocialLoading(false));
    }
  }, [activeTab]);

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div>
      {/* ── Top Stats Banner ─────────────────────────────────────────────────── */}
      <div className="bg-orange-50/60 dark:bg-orange-500/5 border-b border-orange-100 dark:border-orange-500/20 px-4 py-6 sm:px-6 lg:px-8">
        <div className="mb-5">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Role-specific operational overview
          </p>
        </div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {statsLoading ? (
            [0,1,2,3].map(i => <CardSkeleton key={i} />)
          ) : topStats ? (
            <>
              <StatCard icon={Users}    label="Active Residents"  value={topStats.activeResidents}             color="bg-orange-50 dark:bg-orange-500/10 text-orange-500" />
              <StatCard icon={Heart}    label="Active Donors"     value={topStats.activeDonors}                color="bg-pink-50 dark:bg-pink-500/10 text-pink-500" />
              <StatCard icon={Banknote} label="Donations (MTD)"  value={fmtUSD(topStats.monthlyDonations)}    color="bg-emerald-50 dark:bg-emerald-500/10 text-emerald-500" />
              <StatCard icon={TrendingUp} label="Unallocated Funds" value={fmtUSD(topStats.unallocatedFunds)} color={topStats.unallocatedFunds > 0 ? 'bg-yellow-50 dark:bg-yellow-500/10 text-yellow-600' : 'bg-green-50 dark:bg-green-500/10 text-green-500'} />
            </>
          ) : null}
        </div>
      </div>

      {/* ── Rest of dashboard ─────────────────────────────────────────────────── */}
      <div className="p-4 sm:p-6 lg:p-8">
      {/* ── Tab Bar ──────────────────────────────────────────────────────────── */}
      {/* Only show tab bar if the user has access to more than one tab */}
      <div className="mb-6 flex gap-1 rounded-xl border border-gray-200 bg-gray-50 p-1 dark:border-gray-700 dark:bg-gray-800/50 w-fit">
        {([
          { id: 'case',   label: 'Case Management',  icon: ShieldAlert },
          { id: 'donor',  label: 'Donor Management', icon: Banknote },
          { id: 'social', label: 'Social Media',     icon: Megaphone },
        ] as { id: Tab; label: string; icon: React.ComponentType<{ className?: string }> }[])
        .filter(({ id }) => role === AppRoles.Admin || !role || roleTabMap[role] === id)
        .map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition cursor-pointer ${
              activeTab === id
                ? 'bg-white shadow-sm text-orange-600 dark:bg-gray-700 dark:text-orange-400'
                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
            }`}
          >
            <Icon className="h-4 w-4" />
            <span className="hidden sm:inline">{label}</span>
          </button>
        ))}
      </div>

      {/* ── Case Management Tab ───────────────────────────────────────────────── */}
      {activeTab === 'case' && (
        <CaseTab
          loading={caseLoading}
          error={caseError}
          caseData={caseData}
          caseAnalytics={caseAnalytics}
          reintegCands={reintegCands}
          riskDrivers={riskDrivers}
          interventionCoefs={interventionCoefs}
          navigate={navigate}
          onOpenModal={setActiveModal}
        />
      )}

      {/* ── Donor Management Tab ─────────────────────────────────────────────── */}
      {activeTab === 'donor' && (
        <DonorTab
          loading={donorLoading}
          error={donorError}
          donorData={donorData}
          allocData={allocData}
          lapseRisk={lapseRisk}
          upgradeCands={upgradeCands}
          navigate={navigate}
          activeTab={activeTab}
          onAllocationCreated={() => {
            // Re-fetch allocations after creating one
            fetchDonorAllocations().then(setAllocData).catch(() => {});
          }}
        />
      )}

      {/* ── Social Media Tab ─────────────────────────────────────────────────── */}
      {activeTab === 'social' && (
        <SocialTab
          loading={socialLoading}
          error={socialError}
          socialData={socialData}
          postingDrivers={postingDrivers}
          mlForecast={mlForecast}
          navigate={navigate}
        />
      )}
      </div>

      {/* ── Detail Modal ──────────────────────────────────────────────────────── */}
      {activeModal && caseData && (() => {
        const close = () => setActiveModal(null);
        const nav = (path: string, state?: object) => { close(); navigate(path, { state: { ...state, from: '/admin', dashboardTab: activeTab } }); };

        const modalProps = (() => {
          switch (activeModal.type) {
            case 'triage-highrisk':
              return {
                title: 'High / Critical Risk Residents',
                subtitle: `${caseData.triage.highCriticalRisk} resident${caseData.triage.highCriticalRisk !== 1 ? 's' : ''} flagged`,
                content: <TriageHighRiskContent caseData={caseData} onNavigate={nav} />,
              };
            case 'triage-incidents':
              return {
                title: 'Unresolved Incidents',
                subtitle: `${caseData.triage.unresolvedIncidents} open incident${caseData.triage.unresolvedIncidents !== 1 ? 's' : ''}`,
                content: <TriageIncidentsContent caseData={caseData} onNavigate={nav} />,
              };
            case 'triage-flagged':
              return {
                title: 'Flagged Sessions',
                content: <TriageFlaggedContent count={caseData.triage.flaggedSessions} onNavigate={nav} />,
              };
            case 'triage-conferences':
              return {
                title: 'Upcoming Conferences',
                content: <TriageConferencesContent count={caseData.triage.upcomingConferences} onNavigate={nav} />,
              };
            case 'resident':
              return {
                title: activeModal.resident.caseControlNo,
                subtitle: 'Escalated risk — review intervention plan',
                content: <EscalatedResidentContent resident={activeModal.resident} onNavigate={nav} />,
              };
            case 'reintegration':
              return {
                title: activeModal.candidate.caseControlNo,
                subtitle: 'Reintegration candidate',
                content: <ReintegCandidateContent candidate={activeModal.candidate} onNavigate={nav} />,
              };
            case 'safehouse':
              return {
                title: activeModal.safehouse.name,
                subtitle: activeModal.safehouse.region,
                content: <SafehouseDetailContent safehouse={activeModal.safehouse} onNavigate={nav} />,
              };
            case 'incident':
              return {
                title: activeModal.incident.incidentType,
                subtitle: activeModal.incident.incidentDate,
                content: <IncidentDetailContent incident={activeModal.incident} onNavigate={nav} />,
              };
            case 'risk-driver':
              return {
                title: activeModal.label,
                subtitle: 'Risk level driver',
                content: <RiskDriverDetailContent label={activeModal.label} coefficient={activeModal.coefficient} significant={activeModal.significant} />,
              };
            case 'intervention-factor':
              return {
                title: activeModal.label,
                subtitle: `Intervention factor · ${activeModal.direction}`,
                content: <InterventionFactorContent label={activeModal.label} coefficient={activeModal.coefficient} significant={activeModal.significant} direction={activeModal.direction} />,
              };
          }
        })();

        return <DetailModal {...modalProps} onClose={close} />;
      })()}
    </div>
  );
}

// ── Shared StatCard ───────────────────────────────────────────────────────────

function StatCard({
  icon: Icon,
  label,
  value,
  color,
  sub,
  onClick,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string | number;
  color: string;
  sub?: string;
  onClick?: () => void;
}) {
  return (
    <div
      className={`card flex flex-col items-center p-5 text-center ${onClick ? 'cursor-pointer hover:shadow-lg transition' : ''}`}
      onClick={onClick}
    >
      <div className={`mb-3 flex h-11 w-11 items-center justify-center rounded-xl ${color}`}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="text-2xl font-bold text-gray-900 dark:text-white">{value}</div>
      <div className="mt-0.5 text-xs font-medium text-gray-700 dark:text-gray-300">{label}</div>
      {sub && <div className="mt-0.5 text-xs text-gray-400 dark:text-gray-500">{sub}</div>}
    </div>
  );
}

// ── Feature label lookup ───────────────────────────────────────────────────────

const featureLabels: Record<string, string> = {
  safety_concern_rate: 'Safety concerns flagged in sessions',
  'religion_None': 'No religious affiliation recorded',
  'reintegration_type_Independent Living': 'Planned for Independent Living',
  'reintegration_type_Family Reunification': 'Planned for Family Reunification',
  'reintegration_type_Foster Care': 'Planned for Foster Care',
  'reintegration_type_None': 'No reintegration plan yet',
  age: 'Resident age',
  num_children: 'Number of children',
  age_group_Adult: 'Adult age group',
  age_group_Minor: 'Minor age group',
  gender_Female: 'Female resident',
  gender_Male: 'Male resident',
  employment_status_Employed: 'Currently employed',
  employment_status_Unemployed: 'Currently unemployed',
  substance_abuse_history_Yes: 'Substance abuse history recorded',
  mental_health_history_Yes: 'Mental health history recorded',
  'trauma_type_Physical': 'Physical trauma documented',
  'trauma_type_Emotional': 'Emotional trauma documented',
  'trauma_type_Sexual': 'Sexual trauma documented',
  'trauma_type_None': 'No documented trauma type',
  legal_case_status_Ongoing: 'Legal case ongoing',
  legal_case_status_Closed: 'Legal case closed',
  source_of_referral_NGO: 'Referred by NGO',
  source_of_referral_Self: 'Self-referred',
};

function formatFeatureLabel(feature: string): string {
  if (featureLabels[feature]) return featureLabels[feature];
  return feature
    .replace(/_/g, ' ')
    .replace(/\bTrue\b|\bFalse\b/g, '')
    .trim()
    .replace(/^\w/, (c) => c.toUpperCase());
}

// ══════════════════════════════════════════════════════════════════════════════
// CASE MANAGEMENT TAB
// ══════════════════════════════════════════════════════════════════════════════

function CaseTab({
  loading, error, caseData, caseAnalytics, reintegCands, riskDrivers, interventionCoefs, navigate, onOpenModal,
}: {
  loading: boolean;
  error: string | null;
  caseData: CaseManagerData | null;
  caseAnalytics: CaseAnalyticsData | null;
  reintegCands: TopReintegrationCandidate[] | null;
  riskDrivers: RiskDriver[] | null;
  interventionCoefs: RiskDriver[] | null;
  navigate: ReturnType<typeof useNavigate>;
  onOpenModal: (modal: ActiveModal) => void;
}) {
  if (loading) return <CaseTabSkeleton />;
  if (error) return <p className="py-12 text-center text-red-500">Failed to load: {error}</p>;
  if (!caseData) return null;


  const t = caseData.triage;
  const triageCards = [
    {
      icon: ShieldAlert, label: 'High / Critical Risk', value: t.highCriticalRisk,
      color: t.highCriticalRisk > 0 ? 'bg-red-50 dark:bg-red-500/10 text-red-500' : 'bg-green-50 dark:bg-green-500/10 text-green-500',
      onClick: () => onOpenModal({ type: 'triage-highrisk' }),
    },
    {
      icon: AlertTriangle, label: 'Unresolved Incidents', value: t.unresolvedIncidents,
      color: t.unresolvedIncidents > 0 ? 'bg-yellow-50 dark:bg-yellow-500/10 text-yellow-600' : 'bg-green-50 dark:bg-green-500/10 text-green-500',
      onClick: () => onOpenModal({ type: 'triage-incidents' }),
    },
    {
      icon: MessageCircleWarning, label: 'Flagged Sessions', value: t.flaggedSessions,
      color: t.flaggedSessions > 0 ? 'bg-orange-50 dark:bg-orange-500/10 text-orange-500' : 'bg-green-50 dark:bg-green-500/10 text-green-500',
      onClick: () => onOpenModal({ type: 'triage-flagged' }),
    },
    {
      icon: CalendarClock, label: 'Upcoming Conferences', value: t.upcomingConferences,
      color: 'bg-purple-50 dark:bg-purple-500/10 text-purple-500',
      onClick: () => onOpenModal({ type: 'triage-conferences' }),
    },
  ];

  // Education progress chart
  const eduChartData = {
    labels: caseAnalytics?.monthlyEducationProgress.map(p => p.month) ?? [],
    datasets: [{
      label: 'Avg Education Progress',
      data: caseAnalytics?.monthlyEducationProgress.map(p => p.avgProgress) ?? [],
      borderColor: '#f97316',
      backgroundColor: 'rgba(249,115,22,0.15)',
      pointBackgroundColor: '#f97316',
      fill: true,
      tension: 0.3,
      pointRadius: 3,
    }],
  };

  const healthChartData = {
    labels: caseAnalytics?.monthlyHealthScores.map(p => p.month) ?? [],
    datasets: [{
      label: 'Avg Health Score',
      data: caseAnalytics?.monthlyHealthScores.map(p => p.avgScore) ?? [],
      borderColor: '#3b82f6',
      backgroundColor: 'rgba(59,130,246,0.12)',
      pointBackgroundColor: '#3b82f6',
      fill: true,
      tension: 0.3,
      pointRadius: 3,
    }],
  };

  return (
    <div className="space-y-6">
      {/* Triage row */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {triageCards.map(c => (
          <StatCard key={c.label} icon={c.icon} label={c.label} value={c.value} color={c.color} onClick={c.onClick} />
        ))}
      </div>

      {/* Escalated risk — only shown if non-empty */}
      {caseData.escalatedResidents.length > 0 && (
        <div className="card flex max-h-72 flex-col p-5">
          <div className="mb-4 flex shrink-0 items-center justify-between">
            <h3 className="flex items-center gap-2 text-lg font-bold text-gray-900 dark:text-white">
              <TrendingUp className="h-5 w-5 text-red-500" /> Escalated Risk
            </h3>
            <span className="badge bg-red-100 dark:bg-red-500/10 text-red-700 dark:text-red-400">
              {caseData.escalatedResidents.length} resident{caseData.escalatedResidents.length !== 1 ? 's' : ''}
            </span>
          </div>
          <p className="mb-3 shrink-0 text-xs text-gray-500 dark:text-gray-400">
            Risk level has increased since admission — review and update intervention plans.
          </p>
          <div className="flex-1 space-y-2 overflow-y-auto pr-1">
            {caseData.escalatedResidents.map(r => (
              <div
                key={r.residentId}
                className="flex items-center justify-between rounded-lg border border-gray-100 dark:border-gray-700 px-3 py-2 transition hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer"
                onClick={() => onOpenModal({ type: 'resident', resident: r })}
              >
                <div className="min-w-0 flex-1">
                  <span className="text-sm font-medium text-gray-900 dark:text-white">{r.caseControlNo}</span>
                  <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">{r.safehouseName ?? 'Unknown safehouse'}</span>
                </div>
                <div className="flex items-center gap-2 ml-3 shrink-0">
                  <span className={`badge ${riskColor(r.initialRiskLevel)}`}>{r.initialRiskLevel}</span>
                  <ArrowRight className="h-3 w-3 text-gray-400" />
                  <span className={`badge ${riskColor(r.currentRiskLevel)}`}>{r.currentRiskLevel}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Causal Insights ── */}
      <div>
        <div className="mb-1 flex items-center gap-2">
          <FlaskConical className="h-4 w-4 text-orange-500 shrink-0" />
          <h3 className="text-base font-bold text-gray-900 dark:text-white">Causal Insights</h3>
        </div>
        <p className="mb-4 text-xs text-gray-500 dark:text-gray-400">
          OLS regression results identifying statistically significant drivers. Coefficients show estimated effect size;{' '}
          <span className="font-medium">**</span> p&lt;0.01,{' '}
          <span className="font-medium">*</span> p&lt;0.05.
        </p>
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          {/* Risk Drivers */}
          <div className="card">
            <div className="mb-3 flex items-center gap-2">
              <FlaskConical className="h-4 w-4 text-orange-500 shrink-0" />
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                What Drives Resident Risk Level?
              </h3>
            </div>
            <p className="mb-3 text-xs text-gray-400 dark:text-gray-500">
              Significant predictors of current risk score (OLS on all residents)
            </p>
            <div className="space-y-2">
              {riskDrivers && riskDrivers.length > 0 ? (
                [...riskDrivers]
                  .sort((a, b) => b.coefficient - a.coefficient)
                  .map(row => {
                    const isPositive = row.coefficient > 0;
                    return (
                      <div
                        key={row.feature}
                        className="flex cursor-pointer items-center justify-between gap-3 rounded-lg bg-gray-50 px-3 py-2 transition hover:bg-gray-100 dark:bg-gray-800 dark:hover:bg-gray-700"
                        onClick={() => onOpenModal({ type: 'risk-driver', label: formatFeatureLabel(row.feature), coefficient: row.coefficient, significant: row.significant })}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          {isPositive
                            ? <TrendingUp className="h-3.5 w-3.5 shrink-0 text-red-400" />
                            : <TrendingDown className="h-3.5 w-3.5 shrink-0 text-green-400" />}
                          <span className="truncate text-sm text-gray-700 dark:text-gray-300">
                            {formatFeatureLabel(row.feature)}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className={`text-sm font-mono font-medium ${isPositive ? 'text-red-500' : 'text-green-500'}`}>
                            {isPositive ? '+' : ''}{row.coefficient.toFixed(3)}
                          </span>
                          <span className="text-xs text-gray-400">{row.significant}</span>
                        </div>
                      </div>
                    );
                  })
              ) : (
                <p className="text-sm text-gray-500 dark:text-gray-400">No driver data available.</p>
              )}
            </div>
          </div>

          {/* Intervention Factors */}
          {interventionCoefs && interventionCoefs.length > 0 && (() => {
            const posFactors = [...interventionCoefs]
              .filter(d => d.coefficient > 0)
              .sort((a, b) => b.coefficient - a.coefficient)
              .slice(0, 5);
            const negFactors = [...interventionCoefs]
              .filter(d => d.coefficient < 0)
              .sort((a, b) => a.coefficient - b.coefficient)
              .slice(0, 5);
            return (
              <div className="card">
                <div className="mb-3 flex items-center gap-2">
                  <FlaskConical className="h-4 w-4 text-violet-500 shrink-0" />
                  <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                    What Drives Intervention Success?
                  </h3>
                </div>
                <p className="mb-3 text-xs text-gray-400 dark:text-gray-500">
                  Top coefficient drivers of intervention effectiveness score
                </p>
                <div className="space-y-1">
                  <p className="mb-1 text-xs font-medium text-green-600 dark:text-green-400">Positive factors</p>
                  {posFactors.map(d => (
                    <div
                      key={d.feature}
                      className="flex cursor-pointer items-center justify-between gap-3 rounded-lg bg-gray-50 px-3 py-2 transition hover:bg-gray-100 dark:bg-gray-800 dark:hover:bg-gray-700"
                      onClick={() => onOpenModal({ type: 'intervention-factor', label: formatFeatureLabel(d.feature), coefficient: d.coefficient, significant: d.significant, direction: 'positive' })}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <TrendingUp className="h-3.5 w-3.5 shrink-0 text-green-400" />
                        <span className="truncate text-sm text-gray-700 dark:text-gray-300">
                          {formatFeatureLabel(d.feature)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-sm font-mono font-medium text-green-500">
                          +{d.coefficient.toFixed(1)}
                        </span>
                        {d.significant && d.significant !== '(ns)' && (
                          <span className="text-xs text-gray-400">{d.significant}</span>
                        )}
                      </div>
                    </div>
                  ))}
                  <p className="mt-2 mb-1 text-xs font-medium text-red-500 dark:text-red-400">Negative factors</p>
                  {negFactors.map(d => (
                    <div
                      key={d.feature}
                      className="flex cursor-pointer items-center justify-between gap-3 rounded-lg bg-gray-50 px-3 py-2 transition hover:bg-gray-100 dark:bg-gray-800 dark:hover:bg-gray-700"
                      onClick={() => onOpenModal({ type: 'intervention-factor', label: formatFeatureLabel(d.feature), coefficient: d.coefficient, significant: d.significant, direction: 'negative' })}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <TrendingDown className="h-3.5 w-3.5 shrink-0 text-red-400" />
                        <span className="truncate text-sm text-gray-700 dark:text-gray-300">
                          {formatFeatureLabel(d.feature)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-sm font-mono font-medium text-red-500">
                          {d.coefficient.toFixed(1)}
                        </span>
                        {d.significant && d.significant !== '(ns)' && (
                          <span className="text-xs text-gray-400">{d.significant}</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}
        </div>
      </div>

      {/* ── Analytics charts ── */}
      <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-2">
        <div className="card p-5">
          <div className="mb-1 flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-orange-500" />
            <h3 className="text-base font-bold text-gray-900 dark:text-white">Education Progress (12 months)</h3>
          </div>
          <p className="mb-3 text-xs text-gray-500 dark:text-gray-400">Average % completion of enrolled academic or vocational programs across active residents. Consistent scores above 80% reflect strong program engagement.</p>
          <div className="h-44">
            <Line data={eduChartData} options={baseLineOpts} />
          </div>
        </div>
        <div className="card p-5">
          <div className="mb-1 flex items-center gap-2">
            <Heart className="h-4 w-4 text-blue-500" />
            <h3 className="text-base font-bold text-gray-900 dark:text-white">Health Scores (12 months)</h3>
          </div>
          <p className="mb-3 text-xs text-gray-500 dark:text-gray-400">Average monthly health score across active residents, rated 1–5 by our health team across nutrition, sleep, and energy. Scored out of 5.</p>
          <div className="h-44">
            <Line data={healthChartData} options={healthLineOpts} />
          </div>
        </div>
      </div>

      {/* Reintegration candidates — only shown if non-empty */}
      {reintegCands && reintegCands.length > 0 && (
        <div className="card flex max-h-80 flex-col p-5">
          <div className="mb-4 flex shrink-0 items-center justify-between">
            <h3 className="flex items-center gap-2 text-lg font-bold text-gray-900 dark:text-white">
              <CheckCheck className="h-5 w-5 text-emerald-500" /> Reintegration Candidates
            </h3>
            <button className="btn-ghost text-sm" onClick={() => navigate('/cases')}>
              All Cases <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="flex-1 space-y-2 overflow-y-auto pr-1">
            {reintegCands.map(r => (
              <div
                key={r.residentId}
                className="flex items-center justify-between rounded-lg border border-gray-100 dark:border-gray-700 px-3 py-2 transition hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer"
                onClick={() => onOpenModal({ type: 'reintegration', candidate: r })}
              >
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium text-gray-900 dark:text-white">{r.caseControlNo}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {r.safehouseName ?? 'Unknown'} &middot; {r.caseCategory} &middot; {r.assignedSocialWorker ?? 'Unassigned'}
                  </div>
                </div>
                <div className="ml-3 shrink-0 text-right">
                  <div className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">readiness</div>
                  <span className="badge bg-emerald-100 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400">
                    {r.readinessScore.toFixed(1)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Safehouse occupancy + recent incidents */}
      <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-2">
        {/* Occupancy */}
        <div className="card p-5">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">Safehouse Occupancy</h3>
            <button className="btn-ghost text-sm" onClick={() => navigate('/safehouse-management')}>
              Manage <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
          {caseData.safehouseOccupancy.length === 0 ? (
            <p className="text-sm text-gray-500">No active safehouses.</p>
          ) : (
            <div className="space-y-3">
              {caseData.safehouseOccupancy.map(sh => {
                const pct = sh.capacityGirls > 0 ? Math.round(sh.activeResidents / sh.capacityGirls * 100) : 0;
                const bar = pct >= 90 ? 'bg-red-500' : pct >= 70 ? 'bg-yellow-500' : 'bg-emerald-500';
                return (
                  <div
                    key={sh.safehouseId}
                    className="cursor-pointer rounded-lg p-2 hover:bg-gray-50 dark:hover:bg-gray-800 transition"
                    onClick={() => onOpenModal({ type: 'safehouse', safehouse: sh })}
                  >
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium text-gray-700 dark:text-gray-300">{sh.name}</span>
                      <span className="text-gray-500 dark:text-gray-400">
                        {sh.activeResidents} / {sh.capacityGirls}
                        <span className="ml-1 text-xs">({pct}%)</span>
                      </span>
                    </div>
                    <div className="mt-1 h-2 w-full rounded-full bg-gray-100 dark:bg-gray-700">
                      <div className={`h-2 rounded-full ${bar} transition-all`} style={{ width: `${Math.min(pct, 100)}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Recent incidents */}
        <div className="card flex max-h-96 flex-col p-5">
          <div className="mb-4 flex shrink-0 items-center justify-between">
            <h3 className="flex items-center gap-2 text-lg font-bold text-gray-900 dark:text-white">
              <AlertTriangle className="h-5 w-5 text-yellow-500" /> Recent Incidents
            </h3>
          </div>
          {caseData.recentIncidents.length === 0 ? (
            <p className="text-sm text-gray-500">No recent incidents.</p>
          ) : (
            <div className="flex-1 space-y-2 overflow-y-auto pr-1">
              {caseData.recentIncidents.map(i => (
                <div
                  key={i.incidentId}
                  className="flex items-center justify-between rounded-lg border border-gray-100 dark:border-gray-700 px-3 py-2 transition hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer"
                  onClick={() => onOpenModal({ type: 'incident', incident: i })}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-900 dark:text-white">{i.incidentType}</span>
                      {!i.resolved && <span className="badge bg-red-100 dark:bg-red-500/10 text-red-700 dark:text-red-400">Open</span>}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {i.residentCode ?? 'Unknown'} &middot; {i.safehouseName ?? ''} &middot; {i.incidentDate}
                    </div>
                  </div>
                  <span className={`badge ${severityColor(i.severity)}`}>{i.severity}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function CaseTabSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">{[0,1,2,3].map(i => <CardSkeleton key={i} />)}</div>
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <div className="card p-5 space-y-3"><Skeleton className="h-5 w-48" />{[0,1,2,3,4].map(i => <Skeleton key={i} className="h-4" />)}</div>
        <div className="space-y-5">
          <div className="card p-5 space-y-2"><Skeleton className="h-5 w-40" /><Skeleton className="h-44" /></div>
          <div className="card p-5 space-y-2"><Skeleton className="h-5 w-40" /><Skeleton className="h-44" /></div>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// DONOR MANAGEMENT TAB
// ══════════════════════════════════════════════════════════════════════════════

function DonorTab({
  loading, error, donorData, allocData, lapseRisk, upgradeCands, navigate, activeTab, onAllocationCreated,
}: {
  loading: boolean;
  error: string | null;
  donorData: DonorManagerData | null;
  allocData: DonorAllocationsData | null;
  lapseRisk: TopLapseRiskDonor[] | null;
  upgradeCands: TopUpgradePotentialDonor[] | null;
  navigate: ReturnType<typeof useNavigate>;
  activeTab: Tab;
  onAllocationCreated: () => void;
}) {
  if (loading) return <DonorTabSkeleton />;
  if (error) return <p className="py-12 text-center text-red-500">Failed to load: {error}</p>;
  if (!donorData) return null;

  const s = donorData.stats;

  const donorStatCards = [
    { icon: Banknote,   label: 'Donations (MTD)',  value: fmtUSD(s.donationsThisMonth), color: 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-500' },
    { icon: Users,      label: 'Active Donors',    value: s.activeDonors,               color: 'bg-blue-50 dark:bg-blue-500/10 text-blue-500' },
    { icon: AlertTriangle, label: 'At-Risk Donors',value: s.atRiskCount,                color: s.atRiskCount > 0 ? 'bg-yellow-50 dark:bg-yellow-500/10 text-yellow-600' : 'bg-green-50 dark:bg-green-500/10 text-green-500' },
    { icon: TrendingUp, label: 'Unallocated Funds',value: fmtUSD(s.unallocatedFunds),   color: s.unallocatedFunds > 0 ? 'bg-orange-50 dark:bg-orange-500/10 text-orange-500' : 'bg-green-50 dark:bg-green-500/10 text-green-500' },
  ];

  const trendChartData = {
    labels: donorData.donationTrend.map(p => p.month),
    datasets: [{
      label: 'Donations',
      data: donorData.donationTrend.map(p => p.total),
      backgroundColor: 'rgba(249,115,22,0.75)',
      borderRadius: 6,
      borderSkipped: false as const,
    }],
  };

  const trendOpts: ChartOptions<'bar'> = {
    ...baseBarOpts,
    plugins: {
      ...baseBarOpts.plugins,
      tooltip: {
        ...baseBarOpts.plugins?.tooltip,
        callbacks: { label: (ctx) => ' ' + fmtUSD(Number(ctx.raw)) },
      },
    },
    scales: {
      x: { grid: { display: false }, ticks: { color: '#9ca3af' } },
      y: {
        beginAtZero: true,
        grid: { color: 'rgba(156,163,175,0.1)' },
        ticks: { color: '#9ca3af', callback: (v) => fmtUSD(Number(v)) },
      },
    },
  };

  return (
    <div className="space-y-6">
      {/* Stats row */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {donorStatCards.map(c => <StatCard key={c.label} icon={c.icon} label={c.label} value={c.value} color={c.color} />)}
      </div>

      {/* At-risk + upgrade candidates side by side */}
      <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-2">
        {/* At-risk donors */}
        <div className="card flex max-h-80 flex-col p-5">
          <div className="mb-4 flex shrink-0 items-center justify-between">
            <h3 className="flex items-center gap-2 text-base font-bold text-gray-900 dark:text-white">
              <AlertTriangle className="h-4 w-4 text-yellow-500" /> At-Risk Donors
              <span className="badge bg-yellow-100 dark:bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 ml-1">ML ranked</span>
            </h3>
          </div>
          {!lapseRisk ? (
            <div className="space-y-2">{[0,1,2,3].map(i => <Skeleton key={i} className="h-12" />)}</div>
          ) : lapseRisk.length === 0 ? (
            <p className="text-sm text-gray-500">No at-risk donors identified.</p>
          ) : (
            <div className="flex-1 space-y-2 overflow-y-auto pr-1">
              {lapseRisk.map(d => (
                <div
                  key={d.supporterId}
                  className="flex items-center justify-between rounded-lg border border-gray-100 dark:border-gray-700 px-3 py-2 transition hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer"
                  onClick={() => navigate(`/donors/${d.supporterId}`, { state: { from: '/admin', dashboardTab: activeTab } })}
                >
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium text-gray-900 dark:text-white truncate">{d.displayName}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">{d.supporterType}</div>
                  </div>
                  <div className="flex items-center gap-2 ml-2 shrink-0">
                    <span className={`badge ${scoreColor(d.lapseScore)}`}>{d.lapseScore.toFixed(0)}% risk</span>
                    <a
                      href={`mailto:${d.displayName}`}
                      className="btn-icon"
                      title="Send email"
                      onClick={e => e.stopPropagation()}
                    >
                      <Mail className="h-3.5 w-3.5" />
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Upgrade candidates */}
        <div className="card flex max-h-80 flex-col p-5">
          <div className="mb-4 flex shrink-0 items-center justify-between">
            <h3 className="flex items-center gap-2 text-base font-bold text-gray-900 dark:text-white">
              <TrendingUp className="h-4 w-4 text-emerald-500" /> Upgrade Candidates
              <span className="badge bg-emerald-100 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 ml-1">ML ranked</span>
            </h3>
          </div>
          {!upgradeCands ? (
            <div className="space-y-2">{[0,1,2,3].map(i => <Skeleton key={i} className="h-12" />)}</div>
          ) : upgradeCands.length === 0 ? (
            <p className="text-sm text-gray-500">No upgrade candidates identified.</p>
          ) : (
            <div className="flex-1 space-y-2 overflow-y-auto pr-1">
              {upgradeCands.map(d => (
                <div
                  key={d.supporterId}
                  className="flex items-center justify-between rounded-lg border border-gray-100 dark:border-gray-700 px-3 py-2 transition hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer"
                  onClick={() => navigate(`/donors/${d.supporterId}`, { state: { from: '/admin', dashboardTab: activeTab } })}
                >
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium text-gray-900 dark:text-white truncate">{d.displayName}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">{d.supporterType}</div>
                  </div>
                  <div className="flex items-center gap-2 ml-2 shrink-0">
                    <span className={`badge ${upgradeScoreColor(d.upgradeScore)}`}>{d.upgradeScore.toFixed(0)}% potential</span>
                    <ExternalLink className="h-3.5 w-3.5 text-gray-400" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Donation trend chart */}
      <div className="card p-5">
        <h3 className="mb-1 text-lg font-bold text-gray-900 dark:text-white">Donation Trend</h3>
        <p className="mb-4 text-xs text-gray-500 dark:text-gray-400">Monthly monetary donation totals (last 12 months)</p>
        {donorData.donationTrend.length === 0 ? (
          <p className="text-sm text-gray-500">No donation data available.</p>
        ) : (
          <div className="h-56">
            <Bar data={trendChartData} options={trendOpts} />
          </div>
        )}
      </div>

      {/* Allocation Manager */}
      {allocData && (
        <AllocationManager
          allocData={allocData}
          onAllocationCreated={onAllocationCreated}
        />
      )}

      {/* Volunteers & Partners */}
      {donorData.volunteersPartners.length > 0 && (
        <div className="card p-5">
          <h3 className="mb-4 text-lg font-bold text-gray-900 dark:text-white">Volunteers &amp; Partners</h3>
          <div className="overflow-x-auto">
            <table className="table-base w-full min-w-[560px]">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Type</th>
                  <th>Relationship</th>
                  <th>Status</th>
                  <th>In-Kind Value</th>
                </tr>
              </thead>
              <tbody>
                {donorData.volunteersPartners.map(v => (
                  <tr key={v.supporterId} className="cursor-pointer" onClick={() => navigate(`/donors/${v.supporterId}`, { state: { from: '/admin', dashboardTab: activeTab } })}>
                    <td className="font-medium">{v.displayName}</td>
                    <td><span className="badge bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400">{v.supporterType}</span></td>
                    <td>{v.relationshipType}</td>
                    <td><span className={`badge ${v.status === 'Active' ? 'bg-green-100 dark:bg-green-500/10 text-green-700 dark:text-green-400' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'}`}>{v.status}</span></td>
                    <td>{v.inKindTotal > 0 ? fmtUSD(v.inKindTotal) : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Recent donations feed */}
      <div className="card flex max-h-96 flex-col p-5">
        <div className="mb-4 flex shrink-0 items-center justify-between">
          <h3 className="flex items-center gap-2 text-lg font-bold text-gray-900 dark:text-white">
            <Banknote className="h-5 w-5 text-emerald-500" /> Recent Donations
          </h3>
          <button className="btn-ghost text-sm" onClick={() => navigate('/donors')}>
            All Donations <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
        {donorData.recentDonations.length === 0 ? (
          <p className="text-sm text-gray-500">No recent donations.</p>
        ) : (
          <div className="flex-1 space-y-2 overflow-y-auto pr-1">
            {donorData.recentDonations.map(d => {
              const value = d.amount ?? d.estimatedValue ?? 0;
              const unalloc = value - d.totalAllocated;
              return (
                <div key={d.donationId} className="flex items-center justify-between rounded-lg border border-gray-100 dark:border-gray-700 px-3 py-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-900 dark:text-white">{d.supporterName ?? 'Anonymous'}</span>
                      <span className="badge bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400">{d.donationType}</span>
                      {d.isRecurring && <span className="badge bg-blue-100 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400">Recurring</span>}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {d.donationDate}{d.campaignName ? ` — ${d.campaignName}` : ''}
                    </div>
                  </div>
                  <div className="ml-3 shrink-0 text-right">
                    <div className="text-sm font-semibold text-gray-900 dark:text-white">{fmtUSD(value)}</div>
                    {d.donationType === 'Monetary' && unalloc > 0 && (
                      <span className="text-xs text-orange-500">{fmtUSD(unalloc)} unallocated</span>
                    )}
                    {d.donationType === 'Monetary' && unalloc <= 0 && (
                      <span className="text-xs text-green-600 dark:text-green-400">Fully allocated</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function DonorTabSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">{[0,1,2,3].map(i => <CardSkeleton key={i} />)}</div>
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <div className="card p-5 space-y-2">{[0,1,2,3,4].map(i => <Skeleton key={i} className="h-12" />)}</div>
        <div className="card p-5 space-y-2">{[0,1,2,3,4].map(i => <Skeleton key={i} className="h-12" />)}</div>
      </div>
      <div className="card p-5 space-y-2"><Skeleton className="h-5 w-40" /><Skeleton className="h-56" /></div>
    </div>
  );
}

// ── Allocation Manager sub-component ─────────────────────────────────────────

function AllocationManager({
  allocData,
  onAllocationCreated,
}: {
  allocData: DonorAllocationsData;
  onAllocationCreated: () => void;
}) {
  const [showForm, setShowForm] = useState(false);
  const [formDonationId, setFormDonationId] = useState('');
  const [formSafehouseId, setFormSafehouseId] = useState('');
  const [formProgramArea, setFormProgramArea] = useState('');
  const [formAmount, setFormAmount] = useState('');
  const [formNotes, setFormNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState(false);

  const totalPct = allocData.totalReceived > 0
    ? (allocData.totalAllocated / allocData.totalReceived * 100).toFixed(1)
    : '0.0';

  const maxArea = allocData.byProgramArea.length > 0
    ? Math.max(...allocData.byProgramArea.map(a => a.totalAllocated))
    : 1;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    const amt = parseFloat(formAmount);
    if (!formDonationId || !formSafehouseId || !formProgramArea || isNaN(amt) || amt <= 0) {
      setFormError('Please fill in all fields with valid values.');
      return;
    }
    setSaving(true);
    try {
      await createAllocation({
        donationId: parseInt(formDonationId),
        safehouseId: parseInt(formSafehouseId),
        programArea: formProgramArea,
        amountAllocated: amt,
        notes: formNotes || undefined,
      });
      setFormSuccess(true);
      setFormDonationId('');
      setFormSafehouseId('');
      setFormProgramArea('');
      setFormAmount('');
      setFormNotes('');
      setTimeout(() => { setFormSuccess(false); setShowForm(false); }, 1800);
      onAllocationCreated();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to create allocation.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="card p-5">
      <h3 className="mb-4 text-lg font-bold text-gray-900 dark:text-white">Allocation Manager</h3>

      {/* Summary bars */}
      <div className="mb-5 grid grid-cols-3 gap-4 text-center">
        <div>
          <div className="text-lg font-bold text-gray-900 dark:text-white">{fmtUSD(allocData.totalReceived)}</div>
          <div className="text-xs text-gray-500 dark:text-gray-400">Total Received</div>
        </div>
        <div>
          <div className="text-lg font-bold text-gray-900 dark:text-white">{fmtUSD(allocData.totalAllocated)}</div>
          <div className="text-xs text-gray-500 dark:text-gray-400">Allocated ({totalPct}%)</div>
        </div>
        <div>
          <div className={`text-lg font-bold ${allocData.unallocated > 0 ? 'text-orange-600 dark:text-orange-400' : 'text-green-600 dark:text-green-400'}`}>
            {fmtUSD(allocData.unallocated)}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400">Unallocated Gap</div>
        </div>
      </div>

      {/* Overall progress bar */}
      <div className="mb-5">
        <div className="h-2.5 w-full rounded-full bg-gray-100 dark:bg-gray-700">
          <div
            className="h-2.5 rounded-full bg-orange-500 transition-all"
            style={{ width: `${Math.min(parseFloat(totalPct), 100)}%` }}
          />
        </div>
      </div>

      {/* By program area */}
      {allocData.byProgramArea.length > 0 && (
        <div className="mb-5 space-y-2">
          <div className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-2">By Program Area</div>
          {allocData.byProgramArea.map(a => (
            <div key={a.programArea} className="flex items-center gap-3">
              <div className="w-28 shrink-0 text-xs text-gray-700 dark:text-gray-300 truncate">{a.programArea}</div>
              <div className="flex-1 h-2 rounded-full bg-gray-100 dark:bg-gray-700">
                <div
                  className="h-2 rounded-full bg-blue-500 transition-all"
                  style={{ width: `${Math.min(a.totalAllocated / maxArea * 100, 100)}%` }}
                />
              </div>
              <div className="w-24 text-right text-xs font-medium text-gray-700 dark:text-gray-300">{fmtUSD(a.totalAllocated)}</div>
            </div>
          ))}
        </div>
      )}

      {/* Create allocation form toggle */}
      <button
        className="btn-secondary w-full flex items-center justify-center gap-2 text-sm"
        onClick={() => setShowForm(v => !v)}
      >
        <Plus className="h-4 w-4" />
        New Allocation
        <ChevronDown className={`h-4 w-4 transition-transform ${showForm ? 'rotate-180' : ''}`} />
      </button>

      {showForm && (
        <form onSubmit={handleSubmit} className="mt-4 space-y-3 border-t border-gray-100 dark:border-gray-700 pt-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">Donation</label>
              <select
                className="select-field"
                value={formDonationId}
                onChange={e => setFormDonationId(e.target.value)}
                required
              >
                <option value="">Select donation…</option>
                {allocData.unallocatedDonations.map(d => (
                  <option key={d.donationId} value={d.donationId}>
                    {d.supporterName ?? 'Anon'} — {d.donationDate} — {fmtUSD(d.remaining)} remaining
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">Safehouse</label>
              <select
                className="select-field"
                value={formSafehouseId}
                onChange={e => setFormSafehouseId(e.target.value)}
                required
              >
                <option value="">Select safehouse…</option>
                {allocData.safehouses.map(sh => (
                  <option key={sh.safehouseId} value={sh.safehouseId}>{sh.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">Program Area</label>
              <select
                className="select-field"
                value={formProgramArea}
                onChange={e => setFormProgramArea(e.target.value)}
                required
              >
                <option value="">Select area…</option>
                {allocData.programAreas.map(a => (
                  <option key={a} value={a}>{a}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">Amount (USD)</label>
              <input
                type="number"
                min="0.01"
                step="0.01"
                className="input-field"
                placeholder="0.00"
                value={formAmount}
                onChange={e => setFormAmount(e.target.value)}
                required
              />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">Notes (optional)</label>
            <input
              type="text"
              className="input-field"
              placeholder="Allocation notes…"
              value={formNotes}
              onChange={e => setFormNotes(e.target.value)}
            />
          </div>
          {formError && <p className="text-sm text-red-500">{formError}</p>}
          {formSuccess && <p className="text-sm text-green-600 dark:text-green-400">Allocation created successfully.</p>}
          <div className="flex gap-3">
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? 'Saving…' : 'Create Allocation'}
            </button>
            <button type="button" className="btn-secondary" onClick={() => setShowForm(false)}>Cancel</button>
          </div>
        </form>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// SOCIAL MEDIA TAB
// ══════════════════════════════════════════════════════════════════════════════

function SocialTab({
  loading, error, socialData, postingDrivers, mlForecast, navigate,
}: {
  loading: boolean;
  error: string | null;
  socialData: SocialMediaManagerData | null;
  postingDrivers: PostingStrategyDrivers | null;
  mlForecast: MonthlyDonationForecast | null;
  navigate: ReturnType<typeof useNavigate>;
}) {
  if (loading) return <SocialTabSkeleton />;
  if (error) return <p className="py-12 text-center text-red-500">Failed to load: {error}</p>;
  if (!socialData) return null;

  const engagementChartData = {
    labels: socialData.engagementTrend.map(p => p.month),
    datasets: [{
      label: 'Avg Engagement %',
      data: socialData.engagementTrend.map(p => p.avgEngagement),
      borderColor: '#f97316',
      backgroundColor: 'rgba(249,115,22,0.15)',
      fill: true,
      tension: 0.3,
      pointRadius: 3,
      pointBackgroundColor: '#f97316',
    }],
  };

  const referralChartData = {
    labels: socialData.referralTrend.map(p => p.month),
    datasets: [{
      label: 'Donation Referrals',
      data: socialData.referralTrend.map(p => p.totalReferrals),
      backgroundColor: 'rgba(59,130,246,0.75)',
      borderRadius: 6,
      borderSkipped: false as const,
    }],
  };

  const maxPositive = postingDrivers?.top_positive_factors.length
    ? Math.max(...postingDrivers.top_positive_factors.map(f => Math.abs(f.coefficient)))
    : 1;
  const maxNegative = postingDrivers?.top_negative_factors.length
    ? Math.max(...postingDrivers.top_negative_factors.map(f => Math.abs(f.coefficient)))
    : 1;

  return (
    <div className="space-y-6">
      {/* Action queue */}
      <div className="card p-5">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">Action Queue</h3>
          <button className="btn-ghost text-sm" onClick={() => navigate('/social-media')}>
            All Posts <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
        {socialData.actionQueue.length === 0 ? (
          <div className="flex items-center gap-3 rounded-xl border border-green-200 bg-green-50 p-4 dark:border-green-800 dark:bg-green-900/20">
            <CheckCheck className="h-5 w-5 text-green-600 dark:text-green-400 shrink-0" />
            <div>
              <div className="text-sm font-medium text-green-700 dark:text-green-300">All caught up!</div>
              <div className="text-xs text-green-600 dark:text-green-400">All posts have metrics recorded.</div>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            {socialData.actionQueue.map(p => (
              <div key={p.postId} className="flex items-center justify-between rounded-lg border border-gray-100 dark:border-gray-700 px-3 py-2">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="badge bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400">{p.platform}</span>
                    <span className="badge bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400">{p.postType}</span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">{p.createdAt}</span>
                  </div>
                  {p.caption && (
                    <div className="mt-0.5 text-xs text-gray-500 dark:text-gray-400 truncate max-w-sm">{p.caption}</div>
                  )}
                </div>
                <button
                  className="btn-ghost text-sm shrink-0 ml-3"
                  onClick={() => navigate(`/social-media`)}
                >
                  Enter metrics <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          icon={TrendingUp}
          label="Avg Engagement (MTD)"
          value={fmtPct(socialData.avgEngagementThisMonth)}
          color="bg-orange-50 dark:bg-orange-500/10 text-orange-500"
        />
        <StatCard
          icon={Banknote}
          label="Donation Referrals (MTD)"
          value={socialData.referralsThisMonth}
          color="bg-blue-50 dark:bg-blue-500/10 text-blue-500"
        />
        <StatCard
          icon={Brain}
          label="ML Forecast (Next Month)"
          value={mlForecast ? mlForecast.predicted_donation_value_formatted : '—'}
          sub={mlForecast ? mlForecast.confidence_note : undefined}
          color="bg-purple-50 dark:bg-purple-500/10 text-purple-500"
        />
      </div>

      {/* Trend charts side by side */}
      <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-2">
        <div className="card p-5">
          <h3 className="mb-1 text-base font-bold text-gray-900 dark:text-white">Engagement Rate (12 months)</h3>
          <p className="mb-3 text-xs text-gray-500 dark:text-gray-400">Average engagement % across all posts</p>
          <div className="h-52">
            <Line data={engagementChartData} options={baseLineOpts} />
          </div>
        </div>
        <div className="card p-5">
          <h3 className="mb-1 text-base font-bold text-gray-900 dark:text-white">Donation Referrals (12 months)</h3>
          <p className="mb-3 text-xs text-gray-500 dark:text-gray-400">Total referrals from social posts per month</p>
          <div className="h-52">
            <Bar data={referralChartData} options={baseBarOpts} />
          </div>
        </div>
      </div>

      {/* Causal insights */}
      {postingDrivers && (
        <div className="card p-5">
          <div className="mb-1 flex items-center gap-2">
            <Brain className="h-5 w-5 text-orange-500 shrink-0" />
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">What posting factors drive performance?</h3>
          </div>
          <p className="mb-5 text-xs text-gray-500 dark:text-gray-400">
            Causal model — factors associated with higher engagement rate (R² = {(postingDrivers.model_r2 * 100).toFixed(0)}%, n={postingDrivers.n_observations.toLocaleString()} posts).
          </p>
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div>
              <div className="mb-3 text-xs font-semibold uppercase tracking-wide text-orange-600 dark:text-orange-400">Boosts engagement</div>
              <div className="space-y-2.5">
                {postingDrivers.top_positive_factors.map(f => (
                  <DriverBar key={f.feature} label={f.feature} coefficient={f.coefficient} max={maxPositive} positive />
                ))}
              </div>
            </div>
            <div>
              <div className="mb-3 text-xs font-semibold uppercase tracking-wide text-blue-600 dark:text-blue-400">Reduces engagement</div>
              <div className="space-y-2.5">
                {postingDrivers.top_negative_factors.map(f => (
                  <DriverBar key={f.feature} label={f.feature} coefficient={f.coefficient} max={maxNegative} positive={false} />
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Top performing posts */}
      {socialData.topPosts.length > 0 && (
        <div className="card p-5">
          <h3 className="mb-4 text-lg font-bold text-gray-900 dark:text-white">Top Performing Posts (last 90 days)</h3>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {socialData.topPosts.map(p => (
              <div
                key={p.postId}
                className="rounded-xl border border-gray-100 dark:border-gray-700 p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition cursor-pointer"
                onClick={() => navigate('/social-media')}
              >
                <div className="mb-2 flex items-center gap-2">
                  <span className="badge bg-orange-100 dark:bg-orange-500/10 text-orange-700 dark:text-orange-400 font-semibold">
                    {fmtPct(p.engagementPct)}
                  </span>
                  <span className="badge bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400">{p.platform}</span>
                  <span className="badge bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400">{p.postType}</span>
                </div>
                {p.caption && (
                  <p className="mb-3 text-xs text-gray-600 dark:text-gray-400 line-clamp-2">{p.caption}</p>
                )}
                <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
                  <span>👍 {p.likes}</span>
                  <span>💬 {p.comments}</span>
                  <span>↗ {p.shares}</span>
                  {p.donationReferrals > 0 && (
                    <span className="text-emerald-600 dark:text-emerald-400">💸 {p.donationReferrals}</span>
                  )}
                </div>
                <div className="mt-2 text-xs text-gray-400 dark:text-gray-500">{p.createdAt}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function SocialTabSkeleton() {
  return (
    <div className="space-y-6">
      <div className="card p-5 space-y-2">
        <Skeleton className="h-5 w-32" />
        {[0,1,2].map(i => <Skeleton key={i} className="h-12" />)}
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {[0,1,2].map(i => <CardSkeleton key={i} />)}
      </div>
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <div className="card p-5 space-y-2"><Skeleton className="h-5 w-40" /><Skeleton className="h-52" /></div>
        <div className="card p-5 space-y-2"><Skeleton className="h-5 w-40" /><Skeleton className="h-52" /></div>
      </div>
    </div>
  );
}
