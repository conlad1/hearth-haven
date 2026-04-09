import { useEffect, useState } from 'react';
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
import { BarChart3, DollarSign, TrendingUp, Users } from 'lucide-react';
import { fetchDonorAnalytics } from '../api/DonorAPI';
import { DonorAnalyticsResponse } from '../types/Donor';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Title, Tooltip, Legend);

const coralPalette = {
  strong: '#eb7a67',
  medium: '#f29a84',
  soft: '#f5b59c',
  blush: '#f8cdbd',
  cream: '#fde3d7',
  rose: '#cf6f70',
  terracotta: '#b85c5c',
  apricot: '#e7a35f',
  text: '#6b7280',
  grid: 'rgba(242, 140, 122, 0.16)',
};

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
    tooltip: {
      backgroundColor: '#fff7f5',
      titleColor: '#7c2d12',
      bodyColor: '#9a3412',
      borderColor: 'rgba(242, 140, 122, 0.25)',
      borderWidth: 1,
      padding: 12,
      displayColors: false,
    },
  },
  scales: {
    x: {
      grid: { display: false },
      ticks: { color: coralPalette.text },
    },
    y: {
      beginAtZero: true,
      grid: { color: coralPalette.grid },
      ticks: { color: coralPalette.text,
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
    tooltip: {
      backgroundColor: '#fff7f5',
      titleColor: '#7c2d12',
      bodyColor: '#9a3412',
      borderColor: 'rgba(242, 140, 122, 0.25)',
      borderWidth: 1,
      padding: 12,
    },
  },
  scales: {
    x: {
      grid: { display: false },
      ticks: { color: coralPalette.text },
    },
    y: {
      beginAtZero: true,
      grid: { color: coralPalette.grid },
      ticks: {
        color: coralPalette.text,
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
        borderColor: coralPalette.strong,
        backgroundColor: 'rgba(242, 140, 122, 0.18)',
        pointBackgroundColor: coralPalette.medium,
        pointBorderColor: '#fff7f5',
        pointHoverBackgroundColor: coralPalette.strong,
        pointHoverBorderColor: coralPalette.strong,
        pointRadius: 4,
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
        backgroundColor: [
          coralPalette.strong,
          coralPalette.terracotta,
          coralPalette.medium,
          coralPalette.apricot,
          coralPalette.rose,
          coralPalette.soft,
        ],
        hoverBackgroundColor: [
          '#dc6b58',
          '#aa4f4f',
          '#e58972',
          '#d08f4e',
          '#bb6062',
          '#eea78e',
        ],
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
        backgroundColor: [
          coralPalette.strong,
          coralPalette.terracotta,
          coralPalette.medium,
          coralPalette.apricot,
          coralPalette.rose,
        ],
        borderRadius: 10,
        borderSkipped: false,
      },
    ],
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Donor Analytics</h1>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="card">
          <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-[#fff1ed] text-[#f28c7a] dark:bg-[#f28c7a]/10">
            <DollarSign className="h-5 w-5" />
          </div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white">{formatMoney(data.summary.totalDonationValue)}</div>
          <div className="mt-1 text-sm text-gray-500 dark:text-gray-400">Total Contribution Value</div>
        </div>
        <div className="card">
          <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-[#fff4f1] text-[#f6a99c] dark:bg-[#f6a99c]/10">
            <BarChart3 className="h-5 w-5" />
          </div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white">{data.summary.totalDonations}</div>
          <div className="mt-1 text-sm text-gray-500 dark:text-gray-400">Recorded Donations</div>
        </div>
        <div className="card">
          <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-[#fff7f5] text-[#e79a8d] dark:bg-[#e79a8d]/10">
            <Users className="h-5 w-5" />
          </div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white">{data.summary.totalSupporters}</div>
          <div className="mt-1 text-sm text-gray-500 dark:text-gray-400">Total Supporters</div>
        </div>
        <div className="card">
          <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-[#fff3ef] text-[#f28c7a] dark:bg-[#f28c7a]/10">
            <TrendingUp className="h-5 w-5" />
          </div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white">{data.summary.activeSupporters}</div>
          <div className="mt-1 text-sm text-gray-500 dark:text-gray-400">Active Supporters</div>
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
                cutout: '62%',
                plugins: {
                  legend: {
                    position: 'bottom',
                    labels: {
                      color: coralPalette.text,
                      usePointStyle: false,
                      boxWidth: 18,
                      padding: 14,
                    },
                  },
                  tooltip: {
                    backgroundColor: '#fff7f5',
                    titleColor: '#7c2d12',
                    bodyColor: '#9a3412',
                    borderColor: 'rgba(242, 140, 122, 0.25)',
                    borderWidth: 1,
                    padding: 12,
                  },
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
