import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  type ChartOptions,
} from 'chart.js';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
import { ArrowLeft, BarChart3, DollarSign, TrendingUp, Users } from 'lucide-react';
import { fetchDonorAnalytics } from '../api/DonorAPI';
import { DonorAnalyticsResponse } from '../types/Donor';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Title, Tooltip, Legend);

function formatMoney(value: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

const lineOptions: ChartOptions<'line'> = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
  },
  scales: {
    x: { grid: { display: false } },
    y: {
      beginAtZero: true,
      ticks: {
        callback: (value) => formatMoney(Number(value)),
      },
    },
  },
};

const barOptions: ChartOptions<'bar'> = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
  },
  scales: {
    x: { grid: { display: false } },
    y: {
      beginAtZero: true,
      ticks: {
        callback: (value) => formatMoney(Number(value)),
      },
    },
  },
};

export default function DonorAnalytics() {
  const [data, setData] = useState<DonorAnalyticsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchDonorAnalytics()
      .then(setData)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="py-20 text-center text-gray-500">Loading donor analytics...</p>;
  if (error) return <p className="py-20 text-center text-red-500">Failed to load donor analytics: {error}</p>;
  if (!data) return null;

  const trendData = {
    labels: data.donationsOverTime.map((point) => point.label),
    datasets: [
      {
        label: 'Donation Value',
        data: data.donationsOverTime.map((point) => point.totalAmount),
        borderColor: 'rgb(249, 115, 22)',
        backgroundColor: 'rgba(249, 115, 22, 0.15)',
        fill: true,
        tension: 0.3,
      },
    ],
  };

  const typeData = {
    labels: data.donationTypeBreakdown.map((item) => item.donationType),
    datasets: [
      {
        data: data.donationTypeBreakdown.map((item) => item.donationCount),
        backgroundColor: ['#f97316', '#0ea5e9', '#10b981', '#8b5cf6', '#ec4899', '#f59e0b'],
        borderWidth: 0,
      },
    ],
  };

  const campaignData = {
    labels: data.topCampaigns.map((item) => item.campaignName),
    datasets: [
      {
        label: 'Campaign Value',
        data: data.topCampaigns.map((item) => item.totalAmount),
        backgroundColor: 'rgba(15, 23, 42, 0.85)',
        borderRadius: 10,
      },
    ],
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link to="/donors" className="mb-3 inline-flex items-center gap-2 text-sm font-medium text-orange-600 no-underline hover:text-orange-700">
            <ArrowLeft className="h-4 w-4" />
            Back to Donor Management
          </Link>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">DonorAnalytics</h1>
          <p className="mt-2 max-w-2xl text-sm text-gray-500 dark:text-gray-400">
            Aggregated donor trends for staff, including donation growth over time, contribution mix, and the highest-performing campaigns.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="card">
          <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-orange-50 text-orange-500 dark:bg-orange-500/10">
            <DollarSign className="h-5 w-5" />
          </div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white">{formatMoney(data.summary.totalDonationValue)}</div>
          <div className="mt-1 text-sm text-gray-500 dark:text-gray-400">Total contribution value</div>
        </div>
        <div className="card">
          <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-500 dark:bg-blue-500/10">
            <BarChart3 className="h-5 w-5" />
          </div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white">{data.summary.totalDonations}</div>
          <div className="mt-1 text-sm text-gray-500 dark:text-gray-400">Recorded donations</div>
        </div>
        <div className="card">
          <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-500 dark:bg-emerald-500/10">
            <Users className="h-5 w-5" />
          </div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white">{data.summary.totalSupporters}</div>
          <div className="mt-1 text-sm text-gray-500 dark:text-gray-400">Total supporters</div>
        </div>
        <div className="card">
          <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-purple-50 text-purple-500 dark:bg-purple-500/10">
            <TrendingUp className="h-5 w-5" />
          </div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white">{data.summary.activeSupporters}</div>
          <div className="mt-1 text-sm text-gray-500 dark:text-gray-400">Active supporters</div>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="card xl:col-span-2">
          <div className="mb-4">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">Total Donations Over Time</h2>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Monthly donation value aggregated from contribution records.</p>
          </div>
          <div className="h-80">
            <Line data={trendData} options={lineOptions} />
          </div>
        </div>

        <div className="card">
          <div className="mb-4">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">Donation Type Breakdown</h2>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Share of recorded contributions by type.</p>
          </div>
          <div className="h-80">
            <Doughnut
              data={typeData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: { position: 'bottom' },
                },
              }}
            />
          </div>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="card xl:col-span-2">
          <div className="mb-4">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">Top Campaigns</h2>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Highest-value campaigns based on donation records with campaign names.</p>
          </div>
          {data.topCampaigns.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">No campaign-tagged donations are available yet.</p>
          ) : (
            <div className="h-80">
              <Bar data={campaignData} options={barOptions} />
            </div>
          )}
        </div>

        <div className="card">
          <div className="mb-4">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">Supporter Mix</h2>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Current supporter profile distribution from supporter records.</p>
          </div>
          <div className="space-y-3">
            {data.supporterTypeBreakdown.map((item) => (
              <div key={item.supporterType} className="rounded-xl border border-gray-100 px-4 py-3 dark:border-gray-700">
                <div className="flex items-center justify-between gap-3">
                  <span className="font-medium text-gray-900 dark:text-white">{item.supporterType}</span>
                  <span className="text-sm text-gray-500 dark:text-gray-400">{item.supporterCount} supporters</span>
                </div>
                <div className="mt-2 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                  <span>{item.activeCount} active</span>
                  <span>{item.supporterCount - item.activeCount} inactive</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-6 card overflow-x-auto">
        <div className="mb-4">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">Monthly Trend Table</h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Quick reference for totals, donation counts, and unique supporters by month.</p>
        </div>
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead>
            <tr className="border-b border-gray-100 text-gray-500 dark:border-gray-700 dark:text-gray-400">
              <th className="pb-3 font-semibold">Month</th>
              <th className="pb-3 font-semibold">Donation Value</th>
              <th className="pb-3 font-semibold">Donations</th>
              <th className="pb-3 font-semibold">Unique Supporters</th>
            </tr>
          </thead>
          <tbody>
            {data.donationsOverTime.map((point) => (
              <tr key={point.period} className="border-b border-gray-50 text-gray-700 dark:border-gray-800 dark:text-gray-300">
                <td className="py-3">{point.label}</td>
                <td className="py-3 font-medium">{formatMoney(point.totalAmount)}</td>
                <td className="py-3">{point.donationCount}</td>
                <td className="py-3">{point.supporterCount}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
