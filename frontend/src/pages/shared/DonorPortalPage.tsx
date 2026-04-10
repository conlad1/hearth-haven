import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { API_BASE_URL } from '../../api/core/config';
import { apiFetch } from '../../api/core/http';
import {
  ArrowLeft,
  CalendarDays,
  DollarSign,
  HeartHandshake,
  Repeat,
  Wallet,
} from 'lucide-react';

function useOnScreen(threshold = 0.15) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); obs.disconnect(); } },
      { threshold }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return { ref, visible };
}

function FadeIn({ children, className = '', delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  const { ref, visible } = useOnScreen(0.08);
  return (
    <div ref={ref} className={className}
      style={{ opacity: visible ? 1 : 0, transform: visible ? 'translateY(0)' : 'translateY(28px)',
        transition: `opacity 0.65s ease ${delay}ms, transform 0.65s ease ${delay}ms` }}>
      {children}
    </div>
  );
}

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
    apiFetch(`${API_BASE_URL}/Donor/Portal`, { credentials: 'include' })
      .then(async (res) => {
        if (!res.ok) {
          throw new Error(`Failed to load donor portal: ${res.status}`);
        }
        return res.json() as Promise<DonorPortalResponse>;
      })
      .then((portal) => {
        setData(portal);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading)
    return (
      <p className="py-24 text-center text-gray-500 dark:text-gray-400">
        Loading your donor portal...
      </p>
    );
  if (error) return <p className="py-24 text-center text-red-500">{error}</p>;
  if (!data) return null;

  return (
    <div className="py-24 px-6">
      <div className="mx-auto max-w-5xl">
        {/* Header */}
        <FadeIn>
          <Link
            to="/donate"
            className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-orange-500 no-underline hover:text-orange-600 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to donate
          </Link>
          <p className="text-xs font-semibold uppercase tracking-widest text-orange-500 mb-3">
            Your Account
          </p>
          <h1 className="text-3xl font-black text-gray-900 dark:text-white sm:text-4xl">
            Donor Portal
          </h1>
          <p className="mt-4 max-w-lg text-gray-500 dark:text-gray-400 leading-relaxed">
            Welcome back,{' '}
            <span className="font-medium text-gray-700 dark:text-gray-200">
              {data.displayName}
            </span>
            . Here&apos;s your personal donation history.
          </p>
        </FadeIn>

        {/* Stats Cards */}
        <div className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {([
            { icon: HeartHandshake, value: data.displayName, label: data.email ?? 'No email on file' },
            { icon: DollarSign, value: formatMoney(data.totalDonationValue), label: 'Total donated' },
            { icon: Wallet, value: String(data.totalDonations), label: 'Donation records' },
            { icon: CalendarDays, value: data.supporterType ?? 'Supporter', label: data.status },
          ] as const).map((card, i) => (
            <FadeIn key={card.label} delay={i * 80}>
              <div className="rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-6">
                <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-orange-50 dark:bg-orange-500/10 text-orange-500">
                  <card.icon className="h-5 w-5" />
                </div>
                <div className="text-2xl font-black text-gray-900 dark:text-white">
                  {card.value}
                </div>
                <div className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  {card.label}
                </div>
              </div>
            </FadeIn>
          ))}
        </div>

        {/* History Table */}
        <FadeIn delay={350}>
          <div className="mt-10 overflow-x-auto rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900">
            <div className="border-b border-gray-100 dark:border-gray-800 px-6 py-6">
              <p className="text-xs font-semibold uppercase tracking-widest text-orange-500 mb-3">
                Records
              </p>
              <h2 className="text-xl font-black text-gray-900 dark:text-white">
                My Donation History
              </h2>
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
                Donation records read from your supporter profile and filtered by
                your supporter ID.
              </p>
            </div>

            {data.history.length === 0 ? (
              <div className="px-6 py-16 text-center text-sm text-gray-500 dark:text-gray-400">
                No personal donations have been recorded yet.
              </div>
            ) : (
              <table className="w-full min-w-[900px] text-left text-sm">
                <thead className="bg-gray-50 dark:bg-gray-800/60 text-gray-500 dark:text-gray-400">
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
                      <tr
                        key={item.donationId}
                        className="border-t border-gray-100 dark:border-gray-800"
                      >
                        <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">
                          #{item.donationId}
                        </td>
                        <td className="px-6 py-4 text-gray-500 dark:text-gray-400">{item.donationType}</td>
                        <td className="px-6 py-4 text-gray-500 dark:text-gray-400">{item.donationDate}</td>
                        <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">
                          {formatMoney(value, item.currencyCode)}
                        </td>
                        <td className="px-6 py-4 text-gray-500 dark:text-gray-400">{item.campaignName || '--'}</td>
                        <td className="px-6 py-4 text-gray-500 dark:text-gray-400">{item.channelSource || '--'}</td>
                        <td className="px-6 py-4">
                          {item.isRecurring ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-orange-50 px-2.5 py-1 text-xs font-medium text-orange-700 dark:bg-orange-500/10 dark:text-orange-300">
                              <Repeat className="h-3.5 w-3.5" />
                              Recurring
                            </span>
                          ) : (
                            <span className="text-gray-500 dark:text-gray-400">
                              One-time
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-gray-500 dark:text-gray-400">
                          {formatMoney(item.totalAllocated, item.currencyCode)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </FadeIn>
      </div>
    </div>
  );
}
