import { useEffect, useState } from 'react';
import {
  Banknote, Users, GraduationCap, HeartPulse, ArrowRightLeft, Home,
} from 'lucide-react';
import {
  Chart as ChartJS,
  CategoryScale, LinearScale, PointElement, LineElement, BarElement,
  ArcElement, Title, Tooltip, Legend, Filler,
  type ChartOptions,
} from 'chart.js';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
import {
  fetchReportsSummary, fetchDonationTrends, fetchResidentOutcomes,
  fetchSafehousePerformance, fetchReintegrationRates,
  type ReportsSummary, type DonationTrends, type ResidentOutcomes,
  type SafehousePerformance, type ReintegrationRates,
} from '../api/ReportsAPI';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Title, Tooltip, Legend, Filler);

// ── Helpers ──

function fmt(n: number) {
  return '$' + Number(n).toLocaleString('en-US', { minimumFractionDigits: 0 });
}

function pct(n: number) {
  return (n * 100).toFixed(1) + '%';
}

function formatMonth(key: string) {
  const [y, m] = key.split('-');
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[parseInt(m, 10) - 1]} ${y}`;
}

// ── Chart options ──

const baseLineOpts: ChartOptions<'line'> = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { position: 'bottom', labels: { usePointStyle: true, padding: 16, font: { size: 12 } } },
    tooltip: { mode: 'index', intersect: false },
  },
  scales: {
    x: { grid: { display: false }, ticks: { font: { size: 11 } } },
    y: { grid: { display: false }, ticks: { font: { size: 11 } }, beginAtZero: true },
  },
};

const baseBarOpts: ChartOptions<'bar'> = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { position: 'bottom', labels: { usePointStyle: true, padding: 16, font: { size: 12 } } },
    tooltip: { mode: 'index', intersect: false },
  },
  scales: {
    x: { grid: { display: false }, ticks: { font: { size: 11 } } },
    y: { grid: { display: false }, ticks: { font: { size: 11 } }, beginAtZero: true },
  },
};

// ── Color palettes ──

const REGION_COLORS: Record<string, string> = {
  Luzon: 'rgba(249, 115, 22, 0.7)',
  Visayas: 'rgba(59, 130, 246, 0.7)',
  Mindanao: 'rgba(16, 185, 129, 0.7)',
};

const REGION_BORDERS: Record<string, string> = {
  Luzon: 'rgba(249, 115, 22, 1)',
  Visayas: 'rgba(59, 130, 246, 1)',
  Mindanao: 'rgba(16, 185, 129, 1)',
};

const RISK_COLORS: Record<string, string> = {
  Low: 'rgba(34, 197, 94, 0.7)',
  Medium: 'rgba(234, 179, 8, 0.7)',
  High: 'rgba(249, 115, 22, 0.7)',
  Critical: 'rgba(239, 68, 68, 0.7)',
};

const RISK_BORDERS: Record<string, string> = {
  Low: 'rgba(34, 197, 94, 1)',
  Medium: 'rgba(234, 179, 8, 1)',
  High: 'rgba(249, 115, 22, 1)',
  Critical: 'rgba(239, 68, 68, 1)',
};

const CATEGORY_COLORS = [
  'rgba(249, 115, 22, 0.7)',
  'rgba(59, 130, 246, 0.7)',
  'rgba(16, 185, 129, 0.7)',
  'rgba(139, 92, 246, 0.7)',
  'rgba(236, 72, 153, 0.7)',
  'rgba(234, 179, 8, 0.7)',
];

const STATUS_COLORS: Record<string, string> = {
  'Not Started': 'rgba(156, 163, 175, 0.7)',
  'In Progress': 'rgba(59, 130, 246, 0.7)',
  'Completed': 'rgba(34, 197, 94, 0.7)',
  'On Hold': 'rgba(234, 179, 8, 0.7)',
  'Unknown': 'rgba(107, 114, 128, 0.7)',
};

// ── Component ──

export default function ReportsPage() {
  const [region, setRegion] = useState('');
  const [months, setMonths] = useState(12);

  const [summary, setSummary] = useState<ReportsSummary | null>(null);
  const [donations, setDonations] = useState<DonationTrends | null>(null);
  const [outcomes, setOutcomes] = useState<ResidentOutcomes | null>(null);
  const [performance, setPerformance] = useState<SafehousePerformance | null>(null);
  const [reintegration, setReintegration] = useState<ReintegrationRates | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    const filters = { region: region || undefined, months };

    Promise.all([
      fetchReportsSummary(filters),
      fetchDonationTrends(filters),
      fetchResidentOutcomes(filters),
      fetchSafehousePerformance(filters),
      fetchReintegrationRates(filters),
    ])
      .then(([s, d, o, p, r]) => {
        setSummary(s);
        setDonations(d);
        setOutcomes(o);
        setPerformance(p);
        setReintegration(r);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [region, months]);

  if (loading) return <p className="py-20 text-center text-gray-500">Loading reports...</p>;
  if (error) return <p className="py-20 text-center text-red-500">Failed to load reports: {error}</p>;
  if (!summary || !donations || !outcomes || !performance || !reintegration) return null;

  // ── KPI Cards ──

  const kpiCards = [
    { icon: Banknote, label: 'Total Donations', value: summary.totalDonationCount, sub: fmt(summary.totalDonationAmount), color: 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-500' },
    { icon: Users, label: 'Active Residents', value: summary.activeResidents, sub: `across ${summary.safehouseCount} safehouses`, color: 'bg-orange-50 dark:bg-orange-500/10 text-orange-500' },
    { icon: GraduationCap, label: 'Avg Education', value: summary.avgEducationProgress != null ? `${summary.avgEducationProgress}%` : 'N/A', sub: 'progress score', color: 'bg-blue-50 dark:bg-blue-500/10 text-blue-500' },
    { icon: HeartPulse, label: 'Avg Health', value: summary.avgHealthScore != null ? `${summary.avgHealthScore}/5` : 'N/A', sub: 'health score', color: 'bg-purple-50 dark:bg-purple-500/10 text-purple-500' },
    { icon: ArrowRightLeft, label: 'Reintegration Rate', value: pct(summary.reintegrationCompletionRate), sub: 'completed', color: 'bg-teal-50 dark:bg-teal-500/10 text-teal-500' },
    { icon: Home, label: 'Safehouses', value: summary.safehouseCount, sub: 'active locations', color: 'bg-yellow-50 dark:bg-yellow-500/10 text-yellow-500' },
  ];

  // ── Donation Trends Charts ──

  const monthlyTotalsData = {
    labels: donations.monthlyTotals.map(d => formatMonth(d.month)),
    datasets: [{
      label: 'Donation Total',
      data: donations.monthlyTotals.map(d => d.totalAmount),
      borderColor: 'rgba(249, 115, 22, 1)',
      backgroundColor: 'rgba(249, 115, 22, 0.1)',
      borderWidth: 2,
      pointRadius: 3,
      tension: 0.3,
      fill: true,
    }],
  };

  const byTypeData = {
    labels: donations.byType.map(d => d.donationType),
    datasets: [{
      label: 'Amount',
      data: donations.byType.map(d => d.totalAmount),
      backgroundColor: CATEGORY_COLORS.slice(0, donations.byType.length),
      borderRadius: 4,
    }],
  };

  const byRegionData = {
    labels: donations.byRegion.map(d => d.region),
    datasets: [{
      label: 'Allocated',
      data: donations.byRegion.map(d => d.totalAllocated),
      backgroundColor: donations.byRegion.map(d => REGION_COLORS[d.region] || 'rgba(156,163,175,0.7)'),
      borderColor: donations.byRegion.map(d => REGION_BORDERS[d.region] || 'rgba(156,163,175,1)'),
      borderWidth: 1,
      borderRadius: 4,
    }],
  };

  // ── Resident Outcomes Charts ──

  const riskLevels = ['Low', 'Medium', 'High', 'Critical'];
  const getCount = (dist: { riskLevel: string; count: number }[], level: string) =>
    dist.find(d => d.riskLevel === level)?.count ?? 0;

  const riskDistributionData = {
    labels: riskLevels,
    datasets: [
      {
        label: 'Initial Risk',
        data: riskLevels.map(l => getCount(outcomes.initialRiskDistribution, l)),
        backgroundColor: riskLevels.map(l => RISK_COLORS[l]),
        borderColor: riskLevels.map(l => RISK_BORDERS[l]),
        borderWidth: 1,
        borderRadius: 4,
      },
      {
        label: 'Current Risk',
        data: riskLevels.map(l => getCount(outcomes.currentRiskDistribution, l)),
        backgroundColor: riskLevels.map(l => (RISK_COLORS[l] || '').replace('0.7', '0.4')),
        borderColor: riskLevels.map(l => RISK_BORDERS[l]),
        borderWidth: 1,
        borderDash: [4, 4],
        borderRadius: 4,
      },
    ],
  };

  const caseCategoryData = {
    labels: outcomes.caseCategories.map(c => c.category),
    datasets: [{
      data: outcomes.caseCategories.map(c => c.count),
      backgroundColor: CATEGORY_COLORS.slice(0, outcomes.caseCategories.length),
      borderWidth: 0,
    }],
  };

  const educationProgressData = {
    labels: outcomes.monthlyEducationProgress.map(d => formatMonth(d.month)),
    datasets: [{
      label: 'Avg Education Progress %',
      data: outcomes.monthlyEducationProgress.map(d => d.avgProgress),
      borderColor: 'rgba(59, 130, 246, 1)',
      backgroundColor: 'rgba(59, 130, 246, 0.1)',
      borderWidth: 2,
      pointRadius: 3,
      tension: 0.3,
      fill: true,
    }],
  };

  const healthScoresData = {
    labels: outcomes.monthlyHealthScores.map(d => formatMonth(d.month)),
    datasets: [{
      label: 'Avg Health Score',
      data: outcomes.monthlyHealthScores.map(d => d.avgScore),
      borderColor: 'rgba(139, 92, 246, 1)',
      backgroundColor: 'rgba(139, 92, 246, 0.1)',
      borderWidth: 2,
      pointRadius: 3,
      tension: 0.3,
      fill: true,
    }],
  };

  const educationOpts: ChartOptions<'line'> = {
    ...baseLineOpts,
    scales: {
      ...baseLineOpts.scales,
      y: { ...baseLineOpts.scales!.y, min: 0, max: 100, ticks: { font: { size: 11 }, callback: (v) => `${v}%` } },
    },
  };

  const healthOpts: ChartOptions<'line'> = {
    ...baseLineOpts,
    scales: {
      ...baseLineOpts.scales,
      y: { ...baseLineOpts.scales!.y, min: 0, max: 5, ticks: { font: { size: 11 }, stepSize: 1 } },
    },
  };

  // ── Safehouse Performance Chart ──

  const perfSafehouses = performance.safehouses;

  const perfChartData = {
    labels: perfSafehouses.map(s => s.name),
    datasets: [
      {
        label: 'Edu Progress %',
        data: perfSafehouses.map(s => s.avgEducationProgress ?? 0),
        backgroundColor: 'rgba(59, 130, 246, 0.7)',
        borderRadius: 4,
      },
      {
        label: 'Health Score (×20)',
        data: perfSafehouses.map(s => s.avgHealthScore ? s.avgHealthScore * 20 : 0),
        backgroundColor: 'rgba(139, 92, 246, 0.7)',
        borderRadius: 4,
      },
    ],
  };

  const perfBarOpts: ChartOptions<'bar'> = {
    ...baseBarOpts,
    scales: {
      ...baseBarOpts.scales,
      y: { ...baseBarOpts.scales!.y, min: 0, max: 100, ticks: { font: { size: 11 }, callback: (v) => `${v}%` } },
    },
  };

  // ── Reintegration Charts ──

  const reintTypes = [...new Set(reintegration.byTypeAndStatus.map(r => r.reintegrationType))];
  const reintStatuses = [...new Set(reintegration.byTypeAndStatus.map(r => r.status))];

  const reintStackedData = {
    labels: reintTypes,
    datasets: reintStatuses.map(status => ({
      label: status,
      data: reintTypes.map(type => {
        const item = reintegration.byTypeAndStatus.find(r => r.reintegrationType === type && r.status === status);
        return item?.count ?? 0;
      }),
      backgroundColor: STATUS_COLORS[status] || 'rgba(156,163,175,0.7)',
      borderRadius: 4,
    })),
  };

  const reintStackedOpts: ChartOptions<'bar'> = {
    ...baseBarOpts,
    scales: {
      ...baseBarOpts.scales,
      x: { ...baseBarOpts.scales!.x, stacked: true },
      y: { ...baseBarOpts.scales!.y, stacked: true },
    },
  };

  const completionByRegionData = {
    labels: reintegration.completionByRegion.map(r => r.region),
    datasets: [{
      label: 'Completion Rate',
      data: reintegration.completionByRegion.map(r => +(r.rate * 100).toFixed(1)),
      backgroundColor: reintegration.completionByRegion.map(r => REGION_COLORS[r.region] || 'rgba(156,163,175,0.7)'),
      borderColor: reintegration.completionByRegion.map(r => REGION_BORDERS[r.region] || 'rgba(156,163,175,1)'),
      borderWidth: 1,
      borderRadius: 4,
    }],
  };

  const completionBarOpts: ChartOptions<'bar'> = {
    ...baseBarOpts,
    scales: {
      ...baseBarOpts.scales,
      y: { ...baseBarOpts.scales!.y, min: 0, max: 100, ticks: { font: { size: 11 }, callback: (v) => `${v}%` } },
    },
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      {/* Header + Filters */}
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Reports</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Cross-domain analytics across all safehouses and programs
          </p>
        </div>
        <div className="flex items-center gap-3">
          <select
            className="select-field"
            value={region}
            onChange={e => setRegion(e.target.value)}
            aria-label="Filter by region"
          >
            <option value="">All Regions</option>
            <option value="Luzon">Luzon</option>
            <option value="Visayas">Visayas</option>
            <option value="Mindanao">Mindanao</option>
          </select>
          <select
            className="select-field"
            value={months}
            onChange={e => setMonths(Number(e.target.value))}
            aria-label="Filter by time period"
          >
            <option value={6}>Last 6 Months</option>
            <option value={12}>Last 12 Months</option>
            <option value={0}>All Time</option>
          </select>
        </div>
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

      {/* ── Donation Trends ── */}
      <h2 className="mt-10 mb-4 text-lg font-bold text-gray-900 dark:text-white">Donation Trends</h2>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Monthly totals — full width */}
        <div className="card lg:col-span-2">
          <h3 className="mb-3 text-sm font-semibold text-gray-700 dark:text-gray-300">Monthly Donation Totals</h3>
          <div className="h-72" role="img" aria-label="Line chart showing monthly donation totals over time">
            {donations.monthlyTotals.length > 0
              ? <Line data={monthlyTotalsData} options={baseLineOpts} />
              : <p className="py-6 text-center text-sm text-gray-400">No donation data available.</p>}
          </div>
          <div className="mt-4 flex items-center gap-6 text-sm text-gray-600 dark:text-gray-400">
            <span>Recurring: <strong>{donations.recurringVsOneTime.recurringCount}</strong> ({fmt(donations.recurringVsOneTime.recurringAmount)})</span>
            <span>One-time: <strong>{donations.recurringVsOneTime.oneTimeCount}</strong> ({fmt(donations.recurringVsOneTime.oneTimeAmount)})</span>
          </div>
        </div>

        {/* By type */}
        <div className="card">
          <h3 className="mb-3 text-sm font-semibold text-gray-700 dark:text-gray-300">By Donation Type</h3>
          <div className="h-64" role="img" aria-label="Bar chart showing donation amounts by type">
            {donations.byType.length > 0
              ? <Bar data={byTypeData} options={{ ...baseBarOpts, plugins: { ...baseBarOpts.plugins, legend: { display: false } } }} />
              : <p className="py-6 text-center text-sm text-gray-400">No data available.</p>}
          </div>
        </div>

        {/* By region */}
        <div className="card">
          <h3 className="mb-3 text-sm font-semibold text-gray-700 dark:text-gray-300">Allocations by Region</h3>
          <div className="h-64" role="img" aria-label="Bar chart showing donation allocations by region">
            {donations.byRegion.length > 0
              ? <Bar data={byRegionData} options={{ ...baseBarOpts, plugins: { ...baseBarOpts.plugins, legend: { display: false } } }} />
              : <p className="py-6 text-center text-sm text-gray-400">No allocation data available.</p>}
          </div>
        </div>
      </div>

      {/* ── Resident Outcomes ── */}
      <h2 className="mt-10 mb-4 text-lg font-bold text-gray-900 dark:text-white">Resident Outcome Metrics</h2>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Risk distribution */}
        <div className="card">
          <h3 className="mb-3 text-sm font-semibold text-gray-700 dark:text-gray-300">Risk Level Distribution (Initial vs Current)</h3>
          <div className="h-64" role="img" aria-label="Grouped bar chart comparing initial and current risk level distributions">
            <Bar data={riskDistributionData} options={baseBarOpts} />
          </div>
        </div>

        {/* Case categories */}
        <div className="card">
          <h3 className="mb-3 text-sm font-semibold text-gray-700 dark:text-gray-300">Case Categories</h3>
          <div className="mx-auto h-64 w-64" role="img" aria-label="Doughnut chart showing case category distribution">
            {outcomes.caseCategories.length > 0
              ? <Doughnut data={caseCategoryData} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom', labels: { usePointStyle: true, padding: 12, font: { size: 12 } } } } }} />
              : <p className="py-6 text-center text-sm text-gray-400">No data available.</p>}
          </div>
        </div>

        {/* Education progress */}
        <div className="card">
          <h3 className="mb-3 text-sm font-semibold text-gray-700 dark:text-gray-300">Education Progress Over Time</h3>
          <div className="h-64" role="img" aria-label="Line chart showing average education progress over time">
            {outcomes.monthlyEducationProgress.length > 0
              ? <Line data={educationProgressData} options={educationOpts} />
              : <p className="py-6 text-center text-sm text-gray-400">No education data available.</p>}
          </div>
        </div>

        {/* Health scores */}
        <div className="card">
          <h3 className="mb-3 text-sm font-semibold text-gray-700 dark:text-gray-300">Health Scores Over Time</h3>
          <div className="h-64" role="img" aria-label="Line chart showing average health scores over time">
            {outcomes.monthlyHealthScores.length > 0
              ? <Line data={healthScoresData} options={healthOpts} />
              : <p className="py-6 text-center text-sm text-gray-400">No health data available.</p>}
          </div>
        </div>
      </div>

      {/* ── Safehouse Performance ── */}
      <h2 className="mt-10 mb-4 text-lg font-bold text-gray-900 dark:text-white">Safehouse Performance Comparisons</h2>

      {perfSafehouses.length > 0 ? (
        <>
          <div className="card">
            <h3 className="mb-3 text-sm font-semibold text-gray-700 dark:text-gray-300">Education &amp; Health by Safehouse</h3>
            <div className="h-72" role="img" aria-label="Grouped bar chart comparing education progress and health scores across safehouses">
              <Bar data={perfChartData} options={perfBarOpts} />
            </div>
          </div>

          <div className="card mt-6 overflow-x-auto">
            <table className="table-base">
              <thead>
                <tr>
                  <th scope="col">Safehouse</th>
                  <th scope="col">Region</th>
                  <th scope="col">Edu Progress</th>
                  <th scope="col">Health Score</th>
                  <th scope="col">Incidents</th>
                  <th scope="col">Visitations</th>
                  <th scope="col">Recordings</th>
                  <th scope="col">Residents</th>
                </tr>
              </thead>
              <tbody>
                {perfSafehouses.map((s) => (
                  <tr key={s.safehouseId}>
                    <td className="font-medium text-gray-900 dark:text-white">{s.name}</td>
                    <td>
                      <span className={`badge ${
                        s.region === 'Luzon' ? 'bg-orange-100 dark:bg-orange-500/10 text-orange-700 dark:text-orange-400'
                          : s.region === 'Visayas' ? 'bg-blue-100 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400'
                          : 'bg-emerald-100 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
                      }`}>{s.region}</span>
                    </td>
                    <td>{s.avgEducationProgress != null ? `${s.avgEducationProgress}%` : '—'}</td>
                    <td>{s.avgHealthScore != null ? `${s.avgHealthScore}/5` : '—'}</td>
                    <td>{s.totalIncidents}</td>
                    <td>{s.totalVisitations}</td>
                    <td>{s.totalProcessRecordings}</td>
                    <td>{s.latestActiveResidents}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        <div className="card">
          <p className="py-6 text-center text-sm text-gray-400">No safehouse performance data available.</p>
        </div>
      )}

      {/* ── Reintegration Success ── */}
      <h2 className="mt-10 mb-4 text-lg font-bold text-gray-900 dark:text-white">Reintegration Success Rates</h2>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* By type and status */}
        <div className="card">
          <h3 className="mb-3 text-sm font-semibold text-gray-700 dark:text-gray-300">By Type &amp; Status</h3>
          <div className="h-72" role="img" aria-label="Stacked bar chart showing reintegration types broken down by status">
            {reintTypes.length > 0
              ? <Bar data={reintStackedData} options={reintStackedOpts} />
              : <p className="py-6 text-center text-sm text-gray-400">No reintegration data available.</p>}
          </div>
        </div>

        {/* Completion rate by region */}
        <div className="card">
          <h3 className="mb-3 text-sm font-semibold text-gray-700 dark:text-gray-300">Completion Rate by Region</h3>
          <div className="h-56" role="img" aria-label="Bar chart showing reintegration completion rate by region">
            {reintegration.completionByRegion.length > 0
              ? <Bar data={completionByRegionData} options={{ ...completionBarOpts, plugins: { ...completionBarOpts.plugins, legend: { display: false } } }} />
              : <p className="py-6 text-center text-sm text-gray-400">No data available.</p>}
          </div>
          <div className="mt-4 rounded-lg bg-gray-50 p-4 text-center dark:bg-gray-800">
            <div className="text-3xl font-bold text-gray-900 dark:text-white">{pct(reintegration.overallRate.rate)}</div>
            <div className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Overall Completion ({reintegration.overallRate.completed} of {reintegration.overallRate.total})
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
