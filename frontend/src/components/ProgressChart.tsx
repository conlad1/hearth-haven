import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  ChartOptions,
} from 'chart.js';
import { Line, Bar } from 'react-chartjs-2';
import { InterventionPlan } from '../types/InterventionPlan';
import { IncidentReport } from '../types/IncidentReport';
import { HealthWellbeingRecord } from '../types/HealthWellbeingRecord';
import { EducationRecord } from '../types/EducationRecord';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

// ── Helpers ──

function monthKey(dateStr: string) {
  const d = new Date(dateStr);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function formatMonth(key: string) {
  const [y, m] = key.split('-');
  const months = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
  ];
  return `${months[parseInt(m, 10) - 1]} ${y}`;
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  const months = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
  ];
  return `${months[d.getMonth()]} ${d.getDate()}`;
}

const baseLineOpts: ChartOptions<'line'> = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: 'bottom',
      labels: { usePointStyle: true, padding: 16, font: { size: 12 } },
    },
    tooltip: { mode: 'index', intersect: false },
  },
  scales: {
    x: { grid: { display: false }, ticks: { font: { size: 11 } } },
    y: { grid: { color: '#f0f0f0' }, ticks: { font: { size: 11 } } },
  },
};

const baseBarOpts: ChartOptions<'bar'> = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: 'bottom',
      labels: { usePointStyle: true, padding: 16, font: { size: 12 } },
    },
    tooltip: { mode: 'index', intersect: false },
  },
  scales: {
    x: { grid: { display: false }, ticks: { font: { size: 11 } } },
    y: {
      grid: { color: '#f0f0f0' },
      ticks: { font: { size: 11 }, stepSize: 1 },
      beginAtZero: true,
    },
  },
};

// ── Safety Chart ──

interface SafetyChartProps {
  plan: InterventionPlan | null;
  incidents: IncidentReport[];
}

export function SafetyChart({ plan, incidents }: SafetyChartProps) {
  if (incidents.length === 0)
    return <p className="chart-empty">No incident data available to chart.</p>;

  const sorted = [...incidents].sort((a, b) =>
    a.incidentDate.localeCompare(b.incidentDate)
  );
  const buckets: Record<string, { total: number; high: number }> = {};
  sorted.forEach((r) => {
    const k = monthKey(r.incidentDate);
    if (!buckets[k]) buckets[k] = { total: 0, high: 0 };
    buckets[k].total++;
    if (r.severity === 'High') buckets[k].high++;
  });

  const labels = Object.keys(buckets).map(formatMonth);
  const totals = Object.values(buckets).map((b) => b.total);
  const highs = Object.values(buckets).map((b) => b.high);

  const datasets: import('chart.js').ChartDataset<'bar', number[]>[] = [
    {
      label: 'Total Incidents',
      data: totals,
      backgroundColor: 'rgba(59, 130, 246, 0.6)',
      borderColor: 'rgba(59, 130, 246, 1)',
      borderWidth: 1,
      borderRadius: 4,
    },
    {
      label: 'High Severity',
      data: highs,
      backgroundColor: 'rgba(220, 38, 38, 0.6)',
      borderColor: 'rgba(220, 38, 38, 1)',
      borderWidth: 1,
      borderRadius: 4,
    },
  ];

  if (plan?.targetValue != null) {
    datasets.push({
      label: `Target (≤${plan.targetValue}/mo)`,
      data: Array(labels.length).fill(plan.targetValue),
      type: 'line' as unknown as undefined,
      borderColor: '#d97706',
      borderWidth: 2,
      borderDash: [6, 4],
      pointRadius: 0,
      fill: false,
    } as unknown as import('chart.js').ChartDataset<'bar', number[]>);
  }

  return (
    <div className="progress-chart-wrap">
      <h4 className="progress-chart-title">Monthly Incident Trend</h4>
      <div className="progress-chart-canvas">
        <Bar data={{ labels, datasets }} options={baseBarOpts} />
      </div>
    </div>
  );
}

// ── Physical Health Chart ──

interface HealthChartProps {
  plan: InterventionPlan | null;
  records: HealthWellbeingRecord[];
}

export function HealthChart({ plan, records }: HealthChartProps) {
  if (records.length === 0)
    return <p className="chart-empty">No health data available to chart.</p>;

  const sorted = [...records].sort((a, b) =>
    a.recordDate.localeCompare(b.recordDate)
  );
  const labels = sorted.map((r) => formatDate(r.recordDate));

  const mkLine = (label: string, data: (number | null)[], color: string) => ({
    label,
    data,
    borderColor: color,
    backgroundColor: color.replace('1)', '0.1)'),
    borderWidth: 2,
    pointRadius: 3,
    tension: 0.3,
    fill: false,
  });

  const datasets = [
    mkLine(
      'General Health',
      sorted.map((r) => r.generalHealthScore),
      'rgba(59, 130, 246, 1)'
    ),
    mkLine(
      'Nutrition',
      sorted.map((r) => r.nutritionScore),
      'rgba(16, 185, 129, 1)'
    ),
    mkLine(
      'Sleep Quality',
      sorted.map((r) => r.sleepQualityScore),
      'rgba(139, 92, 246, 1)'
    ),
    mkLine(
      'Energy Level',
      sorted.map((r) => r.energyLevelScore),
      'rgba(245, 158, 11, 1)'
    ),
  ];

  if (plan?.targetValue != null) {
    datasets.push({
      label: `Target (${plan.targetValue})`,
      data: Array(labels.length).fill(plan.targetValue),
      borderColor: '#dc2626',
      backgroundColor: 'transparent',
      borderWidth: 2,
      pointRadius: 0,
      tension: 0,
      fill: false,
      borderDash: [6, 4],
    } as ReturnType<typeof mkLine>);
  }

  const opts: ChartOptions<'line'> = {
    ...baseLineOpts,
    scales: {
      ...baseLineOpts.scales,
      y: {
        ...baseLineOpts.scales!.y,
        min: 0,
        max: 5,
        ticks: { font: { size: 11 }, stepSize: 1 },
      },
    },
  };

  return (
    <div className="progress-chart-wrap">
      <h4 className="progress-chart-title">Health Scores Over Time</h4>
      <div className="progress-chart-canvas">
        <Line data={{ labels, datasets }} options={opts} />
      </div>
    </div>
  );
}

// ── Education Chart ──

interface EducationChartProps {
  plan: InterventionPlan | null;
  records: EducationRecord[];
}

export function EducationChart({ plan, records }: EducationChartProps) {
  if (records.length === 0)
    return <p className="chart-empty">No education data available to chart.</p>;

  // Average progress and attendance across schools per date
  const byDate: Record<string, { progress: number[]; attendance: number[] }> =
    {};
  records.forEach((r) => {
    if (!byDate[r.recordDate])
      byDate[r.recordDate] = { progress: [], attendance: [] };
    byDate[r.recordDate].progress.push(r.progressPercent);
    byDate[r.recordDate].attendance.push(r.attendanceRate * 100);
  });
  const dates = Object.keys(byDate).sort();
  const avg = (arr: number[]) =>
    +(arr.reduce((s, v) => s + v, 0) / arr.length).toFixed(1);
  const labels = dates.map(formatDate);

  const datasets = [
    {
      label: 'Avg Progress %',
      data: dates.map((d) => avg(byDate[d].progress)),
      borderColor: 'rgba(59, 130, 246, 1)',
      backgroundColor: 'rgba(59, 130, 246, 0.1)',
      borderWidth: 2,
      pointRadius: 3,
      tension: 0.3,
      fill: true,
    },
    {
      label: 'Avg Attendance %',
      data: dates.map((d) => avg(byDate[d].attendance)),
      borderColor: 'rgba(16, 185, 129, 1)',
      backgroundColor: 'rgba(16, 185, 129, 0.1)',
      borderWidth: 2,
      pointRadius: 3,
      tension: 0.3,
      fill: true,
    },
  ];

  if (plan?.targetValue != null) {
    const targetPct = +(plan.targetValue * 100).toFixed(1);
    datasets.push({
      label: `Target (${targetPct}%)`,
      data: Array(labels.length).fill(targetPct),
      borderColor: '#dc2626',
      backgroundColor: 'transparent',
      borderWidth: 2,
      pointRadius: 0,
      tension: 0,
      fill: false,
      borderDash: [6, 4],
    } as (typeof datasets)[0]);
  }

  const opts: ChartOptions<'line'> = {
    ...baseLineOpts,
    scales: {
      ...baseLineOpts.scales,
      y: {
        ...baseLineOpts.scales!.y,
        min: 0,
        max: 100,
        ticks: { font: { size: 11 }, callback: (v) => `${v}%` },
      },
    },
  };

  return (
    <div className="progress-chart-wrap">
      <h4 className="progress-chart-title">Education Progress Over Time</h4>
      <div className="progress-chart-canvas">
        <Line data={{ labels, datasets }} options={opts} />
      </div>
    </div>
  );
}
