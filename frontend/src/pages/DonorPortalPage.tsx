import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { API_BASE_URL } from '../api/config';
import { AuthService } from '../api/AuthService';
import { ArrowLeft, CalendarDays, DollarSign, HeartHandshake, Repeat, Wallet } from 'lucide-react';

type DonorPortalHistoryItem = {
  donationId: number;
  donationType: string;
  donationDate: string;
  amount: number | null;
  estimatedValue: number | null;
  currencyCode: string;
  isRecurring: boolean;
  channelSource: string | null;
  campaignName: string | null;
  notes: string | null;
  totalAllocated: number;
};

type DonorPortalResponse = {
  displayName: string;
  email: string | null;
  supporterId: number | null;
  supporterType: string | null;
  status: string;
  totalDonations: number;
  totalDonationValue: number;
  history: DonorPortalHistoryItem[];
};

function formatMoney(value: number | null | undefined, currencyCode = 'USD') {
  const amount = Number(value ?? 0);
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currencyCode || 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export default function DonorPortalPage() {
  const [data, setData] = useState<DonorPortalResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const email = AuthService.getUserEmail();
    const params = new URLSearchParams();
    if (email) params.set('email', email);

    fetch(`${API_BASE_URL}/Donor/Portal?${params}`, { credentials: 'include' })
      .then(async (res) => {
        if (!res.ok) {
          throw new Error(`Failed to load donor portal: ${res.status}`);
        }
        return res.json() as Promise<DonorPortalResponse>;
      })
      .then((portal) => {
        setData(portal);
        if (portal.displayName) {
          AuthService.setUserName(portal.displayName);
        }
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="py-20 text-center text-gray-500">Loading your donor portal...</p>;
  if (error) return <p className="py-20 text-center text-red-500">{error}</p>;
  if (!data) return null;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link to="/donate" className="mb-3 inline-flex items-center gap-2 text-sm font-medium text-orange-600 no-underline hover:text-orange-700">
            <ArrowLeft className="h-4 w-4" />
            Back to donate
          </Link>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Donor Portal</h1>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            Welcome back, <span className="font-medium text-gray-700 dark:text-gray-200">{data.displayName}</span>. Here&apos;s your personal donation history.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="card">
          <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-orange-50 text-orange-500 dark:bg-orange-500/10">
            <HeartHandshake className="h-5 w-5" />
          </div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white">{data.displayName}</div>
          <div className="mt-1 text-sm text-gray-500 dark:text-gray-400">{data.email ?? 'No email on file'}</div>
        </div>
        <div className="card">
          <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-orange-50 text-orange-500 dark:bg-orange-500/10">
            <DollarSign className="h-5 w-5" />
          </div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white">{formatMoney(data.totalDonationValue)}</div>
          <div className="mt-1 text-sm text-gray-500 dark:text-gray-400">Total donated</div>
        </div>
        <div className="card">
          <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-orange-50 text-orange-500 dark:bg-orange-500/10">
            <Wallet className="h-5 w-5" />
          </div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white">{data.totalDonations}</div>
          <div className="mt-1 text-sm text-gray-500 dark:text-gray-400">Donation records</div>
        </div>
        <div className="card">
          <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-orange-50 text-orange-500 dark:bg-orange-500/10">
            <CalendarDays className="h-5 w-5" />
          </div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white">{data.supporterType ?? 'Supporter'}</div>
          <div className="mt-1 text-sm text-gray-500 dark:text-gray-400">{data.status}</div>
        </div>
      </div>

      <div className="mt-6 overflow-x-auto rounded-2xl border border-gray-200 bg-white shadow-md dark:border-gray-700 dark:bg-gray-900">
        <div className="border-b border-gray-100 px-6 py-5 dark:border-gray-800">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">My Donation History</h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Donation records read from your supporter profile and filtered by your supporter ID.
          </p>
        </div>

        {data.history.length === 0 ? (
          <div className="px-6 py-10 text-center text-sm text-gray-500 dark:text-gray-400">
            No personal donations have been recorded yet.
          </div>
        ) : (
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead className="bg-gray-50 text-gray-500 dark:bg-gray-800/60 dark:text-gray-400">
              <tr>
                <th className="px-6 py-3 font-semibold">Donation ID</th>
                <th className="px-6 py-3 font-semibold">Type</th>
                <th className="px-6 py-3 font-semibold">Date</th>
                <th className="px-6 py-3 font-semibold">Amount</th>
                <th className="px-6 py-3 font-semibold">Campaign</th>
                <th className="px-6 py-3 font-semibold">Channel</th>
                <th className="px-6 py-3 font-semibold">Recurring</th>
                <th className="px-6 py-3 font-semibold">Allocated</th>
              </tr>
            </thead>
            <tbody>
              {data.history.map((item) => {
                const value = item.amount ?? item.estimatedValue;
                return (
                  <tr key={item.donationId} className="border-t border-gray-100 dark:border-gray-800">
                    <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">#{item.donationId}</td>
                    <td className="px-6 py-4">{item.donationType}</td>
                    <td className="px-6 py-4">{item.donationDate}</td>
                    <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">{formatMoney(value, item.currencyCode)}</td>
                    <td className="px-6 py-4">{item.campaignName || '--'}</td>
                    <td className="px-6 py-4">{item.channelSource || '--'}</td>
                    <td className="px-6 py-4">
                      {item.isRecurring ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-orange-50 px-2.5 py-1 text-xs font-medium text-orange-700 dark:bg-orange-500/10 dark:text-orange-300">
                          <Repeat className="h-3.5 w-3.5" />
                          Recurring
                        </span>
                      ) : (
                        <span className="text-gray-500 dark:text-gray-400">One-time</span>
                      )}
                    </td>
                    <td className="px-6 py-4">{formatMoney(item.totalAllocated, item.currencyCode)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
