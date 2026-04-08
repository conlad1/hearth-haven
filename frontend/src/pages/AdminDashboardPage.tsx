import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users, Home, AlertTriangle, CalendarClock, Banknote,
  ShieldAlert, Eye, MessageCircleWarning, ArrowRight,
} from 'lucide-react';
import {
  fetchDashboardStats, fetchSafehouseOccupancy, fetchRecentIncidents,
  fetchRecentVisitations, fetchConcerningSessions, fetchUpcomingConferences,
  fetchHighRiskResidents, fetchRecentDonations,
  DashboardStats, SafehouseOccupancy, DashboardIncident, DashboardVisitation,
  DashboardSession, DashboardConference, DashboardHighRiskResident, DashboardDonation,
} from '../api/AdminDashboardAPI';

function fmt(n: number) {
  return '\u20B1' + Number(n).toLocaleString('en-PH', { minimumFractionDigits: 0 });
}

function severityColor(severity: string) {
  const s = severity.toLowerCase();
  if (s === 'high') return 'bg-red-100 dark:bg-red-500/10 text-red-700 dark:text-red-400';
  if (s === 'medium') return 'bg-yellow-100 dark:bg-yellow-500/10 text-yellow-700 dark:text-yellow-400';
  return 'bg-green-100 dark:bg-green-500/10 text-green-700 dark:text-green-400';
}

function riskColor(level: string) {
  const s = level.toLowerCase();
  if (s === 'critical') return 'bg-red-100 dark:bg-red-500/10 text-red-700 dark:text-red-400';
  if (s === 'high') return 'bg-orange-100 dark:bg-orange-500/10 text-orange-700 dark:text-orange-400';
  return 'bg-yellow-100 dark:bg-yellow-500/10 text-yellow-700 dark:text-yellow-400';
}

function outcomeColor(outcome: string) {
  const s = outcome.toLowerCase();
  if (s === 'favorable') return 'bg-green-100 dark:bg-green-500/10 text-green-700 dark:text-green-400';
  if (s === 'unfavorable') return 'bg-red-100 dark:bg-red-500/10 text-red-700 dark:text-red-400';
  if (s === 'needs improvement') return 'bg-yellow-100 dark:bg-yellow-500/10 text-yellow-700 dark:text-yellow-400';
  return 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-400';
}

export default function AdminDashboardPage() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [occupancy, setOccupancy] = useState<SafehouseOccupancy[]>([]);
  const [incidents, setIncidents] = useState<DashboardIncident[]>([]);
  const [visitations, setVisitations] = useState<DashboardVisitation[]>([]);
  const [sessions, setSessions] = useState<DashboardSession[]>([]);
  const [conferences, setConferences] = useState<DashboardConference[]>([]);
  const [highRisk, setHighRisk] = useState<DashboardHighRiskResident[]>([]);
  const [donations, setDonations] = useState<DashboardDonation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      fetchDashboardStats(),
      fetchSafehouseOccupancy(),
      fetchRecentIncidents(),
      fetchRecentVisitations(),
      fetchConcerningSessions(),
      fetchUpcomingConferences(),
      fetchHighRiskResidents(),
      fetchRecentDonations(),
    ])
      .then(([s, o, i, v, ss, c, hr, d]) => {
        setStats(s);
        setOccupancy(o);
        setIncidents(i);
        setVisitations(v);
        setSessions(ss);
        setConferences(c);
        setHighRisk(hr);
        setDonations(d);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="py-20 text-center text-gray-500">Loading dashboard...</p>;
  if (error) return <p className="py-20 text-center text-red-500">Failed to load dashboard: {error}</p>;
  if (!stats) return null;

  const kpiCards = [
    { icon: Users, label: 'Active Residents', value: stats.activeResidents, sub: `${stats.totalResidents} total`, color: 'bg-orange-50 dark:bg-orange-500/10 text-orange-500' },
    { icon: Home, label: 'Active Safehouses', value: stats.activeSafehouses, sub: `${stats.activePartners} partners`, color: 'bg-blue-50 dark:bg-blue-500/10 text-blue-500' },
    { icon: ShieldAlert, label: 'High / Critical Risk', value: stats.highRiskCount, sub: 'active cases', color: stats.highRiskCount > 0 ? 'bg-red-50 dark:bg-red-500/10 text-red-500' : 'bg-green-50 dark:bg-green-500/10 text-green-500' },
    { icon: AlertTriangle, label: 'Unresolved Incidents', value: stats.unresolvedIncidents, sub: `${stats.flaggedSessions} flagged sessions`, color: stats.unresolvedIncidents > 0 ? 'bg-yellow-50 dark:bg-yellow-500/10 text-yellow-600' : 'bg-green-50 dark:bg-green-500/10 text-green-500' },
    { icon: Banknote, label: 'Donations (30d)', value: stats.recentDonationCount, sub: fmt(stats.recentDonationTotal), color: 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-500' },
    { icon: CalendarClock, label: 'Upcoming Conferences', value: stats.upcomingConferences, sub: `${stats.pendingFollowUpVisits} follow-up visits`, color: 'bg-purple-50 dark:bg-purple-500/10 text-purple-500' },
  ];

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Admin Dashboard</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Operational overview across all safehouses and programs
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {kpiCards.map((card) => (
          <div key={card.label} className="card flex flex-col items-center text-center">
            <div className={`mb-3 flex h-11 w-11 items-center justify-center rounded-xl ${card.color}`}>
              <card.icon className="h-5 w-5" />
            </div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">{card.value}</div>
            <div className="mt-0.5 text-xs font-medium text-gray-700 dark:text-gray-300">{card.label}</div>
            <div className="mt-0.5 text-xs text-gray-400 dark:text-gray-500">{card.sub}</div>
          </div>
        ))}
      </div>

      {/* Safehouse Occupancy */}
      <div className="mt-8">
        <div className="card">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">Safehouse Occupancy</h2>
            <button className="btn-ghost text-sm" onClick={() => navigate('/safehouse-management')}>
              Manage <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
          {occupancy.length === 0 ? (
            <p className="text-sm text-gray-500">No active safehouses.</p>
          ) : (
            <div className="space-y-3">
              {occupancy.map((sh) => {
                const pct = sh.capacityGirls > 0 ? Math.round((sh.activeResidents / sh.capacityGirls) * 100) : 0;
                const barColor = pct >= 90 ? 'bg-red-500' : pct >= 70 ? 'bg-yellow-500' : 'bg-emerald-500';
                return (
                  <div key={sh.safehouseId} className="cursor-pointer rounded-lg p-2 -mx-2 hover:bg-gray-50 dark:hover:bg-gray-800 transition" onClick={() => navigate(`/safehouse-management/safehouses/${sh.safehouseId}`, { state: { from: '/admin' } })}>
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium text-gray-700 dark:text-gray-300">{sh.name}</span>
                      <span className="text-gray-500 dark:text-gray-400">
                        {sh.activeResidents} / {sh.capacityGirls}
                        <span className="ml-1 text-xs">({pct}%)</span>
                      </span>
                    </div>
                    <div className="mt-1 h-2 w-full rounded-full bg-gray-100 dark:bg-gray-800">
                      <div className={`h-2 rounded-full ${barColor} transition-all`} style={{ width: `${Math.min(pct, 100)}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Two-column: High Risk Residents + Upcoming Conferences */}
      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* High Risk Residents */}
        <div className="card">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-lg font-bold text-gray-900 dark:text-white">
              <ShieldAlert className="h-5 w-5 text-red-500" /> High Risk Residents
            </h2>
            <button className="btn-ghost text-sm" onClick={() => navigate('/cases')}>
              All Cases <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
          {highRisk.length === 0 ? (
            <p className="text-sm text-gray-500">No high-risk active cases.</p>
          ) : (
            <div className="space-y-2">
              {highRisk.map((r) => (
                <div
                  key={r.residentId}
                  className="flex items-center justify-between rounded-lg border border-gray-100 dark:border-gray-700 px-3 py-2 transition hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer"
                  onClick={() => navigate(`/cases/${r.residentId}`, { state: { from: '/admin' } })}
                >
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium text-gray-900 dark:text-white">{r.caseControlNo}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {r.safehouseName ?? 'Unknown'} &middot; {r.caseCategory} &middot; {r.assignedSocialWorker ?? 'Unassigned'}
                    </div>
                  </div>
                  <span className={`badge ${riskColor(r.currentRiskLevel)}`}>{r.currentRiskLevel}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Upcoming Conferences */}
        <div className="card">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-lg font-bold text-gray-900 dark:text-white">
              <CalendarClock className="h-5 w-5 text-purple-500" /> Upcoming Case Conferences
            </h2>
          </div>
          {conferences.length === 0 ? (
            <p className="text-sm text-gray-500">No upcoming conferences scheduled.</p>
          ) : (
            <div className="space-y-2">
              {conferences.map((c) => (
                <div
                  key={c.planId}
                  className="flex items-center justify-between rounded-lg border border-gray-100 dark:border-gray-700 px-3 py-2 transition hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer"
                  onClick={() => navigate(`/cases/${c.residentId}`, { state: { from: '/admin', tab: c.planCategory === 'Safety' ? 'safety' : c.planCategory === 'Physical Health' ? 'physicalHealth' : c.planCategory === 'Education' ? 'education' : 'resident' } })}
                >
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium text-gray-900 dark:text-white">{c.planCategory}: {c.planDescription}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {c.residentCode ?? 'Unknown'} &middot; Target: {c.targetDate}
                    </div>
                  </div>
                  <div className="ml-3 shrink-0 text-right">
                    <div className="text-sm font-semibold text-purple-600 dark:text-purple-400">{c.caseConferenceDate}</div>
                    <span className="badge bg-purple-100 dark:bg-purple-500/10 text-purple-700 dark:text-purple-400">{c.status}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Two-column: Recent Incidents + Concerning Sessions */}
      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Recent Incidents */}
        <div className="card">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-lg font-bold text-gray-900 dark:text-white">
              <AlertTriangle className="h-5 w-5 text-yellow-500" /> Recent Incidents
            </h2>
          </div>
          {incidents.length === 0 ? (
            <p className="text-sm text-gray-500">No recent incidents.</p>
          ) : (
            <div className="space-y-2">
              {incidents.map((i) => (
                <div
                  key={i.incidentId}
                  className="flex items-center justify-between rounded-lg border border-gray-100 dark:border-gray-700 px-3 py-2 transition hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer"
                  onClick={() => navigate(`/cases/${i.residentId}`, { state: { from: '/admin', tab: 'safety' } })}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-900 dark:text-white">{i.incidentType}</span>
                      {!i.resolved && <span className="badge bg-red-100 dark:bg-red-500/10 text-red-700 dark:text-red-400">Open</span>}
                      {i.followUpRequired && <span className="badge bg-yellow-100 dark:bg-yellow-500/10 text-yellow-700 dark:text-yellow-400">Follow-up</span>}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {i.residentCode ?? 'Unknown'} &middot; {i.safehouseName ?? ''} &middot; {i.incidentDate} &middot; {i.reportedBy}
                    </div>
                  </div>
                  <span className={`badge ${severityColor(i.severity)}`}>{i.severity}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Concerning Counseling Sessions */}
        <div className="card">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-lg font-bold text-gray-900 dark:text-white">
              <MessageCircleWarning className="h-5 w-5 text-red-500" /> Flagged Counseling Sessions
            </h2>
          </div>
          {sessions.length === 0 ? (
            <p className="text-sm text-gray-500">No flagged sessions in the last 30 days.</p>
          ) : (
            <div className="space-y-2">
              {sessions.map((s) => (
                <div
                  key={s.recordingId}
                  className="flex items-center justify-between rounded-lg border border-gray-100 dark:border-gray-700 px-3 py-2 transition hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer"
                  onClick={() => navigate(`/cases/${s.residentId}`, { state: { from: '/admin', tab: 'physicalHealth' } })}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-900 dark:text-white">{s.sessionType} Session</span>
                      {s.referralMade && <span className="badge bg-blue-100 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400">Referred</span>}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {s.residentCode ?? 'Unknown'} &middot; {s.sessionDate} &middot; {s.socialWorker}
                    </div>
                  </div>
                  <div className="ml-3 shrink-0 text-right text-xs">
                    <div className="text-gray-500 dark:text-gray-400">{s.emotionalStateObserved} &rarr; {s.emotionalStateEnd}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Two-column: Recent Visitations + Recent Donations */}
      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Recent Visitations */}
        <div className="card">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-lg font-bold text-gray-900 dark:text-white">
              <Eye className="h-5 w-5 text-blue-500" /> Recent Visitations
            </h2>
          </div>
          {visitations.length === 0 ? (
            <p className="text-sm text-gray-500">No recent visitations.</p>
          ) : (
            <div className="space-y-2">
              {visitations.map((v) => (
                <div
                  key={v.visitationId}
                  className="flex items-center justify-between rounded-lg border border-gray-100 dark:border-gray-700 px-3 py-2 transition hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer"
                  onClick={() => navigate(`/cases/${v.residentId}`, { state: { from: '/admin', tab: 'safety' } })}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-900 dark:text-white">{v.visitType}</span>
                      {v.safetyConcernsNoted && <span className="badge bg-red-100 dark:bg-red-500/10 text-red-700 dark:text-red-400">Safety Concern</span>}
                      {v.followUpNeeded && <span className="badge bg-yellow-100 dark:bg-yellow-500/10 text-yellow-700 dark:text-yellow-400">Follow-up</span>}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {v.residentCode ?? 'Unknown'} &middot; {v.visitDate} &middot; {v.socialWorker}
                    </div>
                  </div>
                  <span className={`badge ${outcomeColor(v.visitOutcome)}`}>{v.visitOutcome}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Donations */}
        <div className="card">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-lg font-bold text-gray-900 dark:text-white">
              <Banknote className="h-5 w-5 text-emerald-500" /> Recent Donations
            </h2>
            <button className="btn-ghost text-sm" onClick={() => navigate('/donors')}>
              All Donations <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
          {donations.length === 0 ? (
            <p className="text-sm text-gray-500">No recent donations.</p>
          ) : (
            <div className="space-y-2">
              {donations.map((d) => {
                const value = d.amount ?? d.estimatedValue ?? 0;
                const unallocated = value - d.totalAllocated;
                return (
                  <div
                    key={d.donationId}
                    className="flex items-center justify-between rounded-lg border border-gray-100 dark:border-gray-700 px-3 py-2 transition hover:bg-gray-50 dark:hover:bg-gray-800"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                          {d.supporterName ?? 'Anonymous'}
                        </span>
                        <span className="badge bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400">{d.donationType}</span>
                        {d.isRecurring && <span className="badge bg-blue-100 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400">Recurring</span>}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {d.donationDate}{d.campaignName ? ` \u2014 ${d.campaignName}` : ''}
                      </div>
                    </div>
                    <div className="ml-3 shrink-0 text-right">
                      <div className="text-sm font-semibold text-gray-900 dark:text-white">{fmt(value)}</div>
                      {d.donationType === 'Monetary' && unallocated > 0 && (
                        <button
                          className="mt-0.5 text-xs font-medium text-orange-500 hover:text-orange-600 transition cursor-pointer"
                          onClick={() => navigate('/allocations')}
                        >
                          {fmt(unallocated)} unallocated &rarr;
                        </button>
                      )}
                      {d.donationType === 'Monetary' && unallocated <= 0 && (
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
    </div>
  );
}
