import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, DollarSign, HeartHandshake, Repeat, Save, UserRound, Wallet } from 'lucide-react';
import { fetchMyProfile, updateMyProfile, type UserProfile } from '../api/ProfileAPI';
import { API_BASE_URL } from '../api/config';
import { apiFetch } from '../api/http';
import { isValidPhone } from '../utils/phoneValidation';

const blankProfile: UserProfile = {
  supporterId: null,
  supporterType: 'MonetaryDonor',
  displayName: '',
  organizationName: null,
  firstName: null,
  lastName: null,
  relationshipType: 'Local',
  region: null,
  country: null,
  email: '',
  phone: null,
  status: 'Active',
  firstDonationDate: null,
  acquisitionChannel: null,
  createdAt: null,
};

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

function valueOrEmpty(value: string | null | undefined) {
  return value ?? '';
}

function formatMoney(value: number | null | undefined, currencyCode = 'USD') {
  const amount = Number(value ?? 0);
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currencyCode || 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export default function ProfilePage() {
  const [profile, setProfile] = useState<UserProfile>(blankProfile);
  const [portal, setPortal] = useState<DonorPortalResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      fetchMyProfile(),
      apiFetch(`${API_BASE_URL}/Donor/Portal`, { credentials: 'include' })
        .then(async (res) => {
          if (!res.ok) throw new Error(`Failed to fetch donation history: ${res.status}`);
          return res.json() as Promise<DonorPortalResponse>;
        }),
    ])
      .then(([profileData, portalData]) => {
        setProfile(profileData);
        setPortal(portalData);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  function setField<K extends keyof UserProfile>(key: K, value: UserProfile[K]) {
    setProfile((current) => ({ ...current, [key]: value }));
  }

  function handlePhoneChange(value: string) {
    const cleaned = value.replace(/[^0-9\s\-\.\+\(\)]/g, '');
    setField('phone', cleaned);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);

    const phoneValue = (profile.phone ?? '').trim();
    if (phoneValue && !isValidPhone(phoneValue)) {
      setSaving(false);
      setError('Please enter a valid phone number (10-15 digits with common separators like +, -, .).');
      return;
    }

    try {
      const updated = await updateMyProfile(profile);
      setProfile(updated);
      setPortal((current) => current ? {
        ...current,
        displayName: updated.displayName,
        email: updated.email,
        supporterId: updated.supporterId,
        supporterType: updated.supporterType,
        status: updated.status,
      } : current);
      setSuccess('Profile updated successfully.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update profile.');
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <p className="py-20 text-center text-gray-500">Loading your profile...</p>;

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <div className="mb-8">
        <Link to="/" className="mb-3 inline-flex items-center gap-2 text-sm font-medium text-orange-600 no-underline hover:text-orange-700">
          <ArrowLeft className="h-4 w-4" />
          Back to home
        </Link>
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-50 text-orange-500 dark:bg-orange-500/10">
            <UserRound className="h-7 w-7" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">My Profile</h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Keep your account information complete and up to date.
            </p>
          </div>
        </div>
      </div>

      {portal && (
        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <div className="card">
            <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-orange-50 text-orange-500 dark:bg-orange-500/10">
              <HeartHandshake className="h-5 w-5" />
            </div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">{portal.displayName}</div>
            <div className="mt-1 text-sm text-gray-500 dark:text-gray-400">{portal.email ?? 'No email on file'}</div>
          </div>
          <div className="card">
            <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-orange-50 text-orange-500 dark:bg-orange-500/10">
              <DollarSign className="h-5 w-5" />
            </div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">{formatMoney(portal.totalDonationValue)}</div>
            <div className="mt-1 text-sm text-gray-500 dark:text-gray-400">Total donated</div>
          </div>
          <div className="card">
            <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-orange-50 text-orange-500 dark:bg-orange-500/10">
              <Wallet className="h-5 w-5" />
            </div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">{portal.totalDonations}</div>
            <div className="mt-1 text-sm text-gray-500 dark:text-gray-400">Donation records</div>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="card">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">Account Info</h2>
          <div className="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Name</span>
              <input className="input-field" value={valueOrEmpty(profile.displayName)} onChange={(e) => setField('displayName', e.target.value)} />
            </label>
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Email</span>
              <input type="email" className="input-field" value={valueOrEmpty(profile.email)} onChange={(e) => setField('email', e.target.value)} />
            </label>
            <label className="block sm:col-span-2">
              <span className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Phone Number (Optional)</span>
              <input
                type="tel"
                placeholder="Add a phone number"
                className="input-field"
                value={valueOrEmpty(profile.phone)}
                onChange={(e) => handlePhoneChange(e.target.value)}
                inputMode="tel"
                autoComplete="tel"
              />
            </label>
          </div>
        </div>

        {error && <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600 dark:bg-red-500/10 dark:text-red-400">{error}</p>}
        {success && <p className="rounded-xl bg-green-50 px-4 py-3 text-sm text-green-700 dark:bg-green-500/10 dark:text-green-300">{success}</p>}

        <div className="flex justify-end">
          <button type="submit" className="btn-primary" disabled={saving}>
            <Save className="h-4 w-4" />
            {saving ? 'Saving...' : 'Save Profile'}
          </button>
        </div>
      </form>

      {portal && (
        <div className="mt-6 overflow-x-auto rounded-2xl border border-gray-200 bg-white shadow-md dark:border-gray-700 dark:bg-gray-900">
          <div className="border-b border-gray-100 px-6 py-5 dark:border-gray-800">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">My Donation History</h2>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Donation records linked to your supporter profile.
            </p>
          </div>

          {portal.history.length === 0 ? (
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
                {portal.history.map((item) => {
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
      )}
    </div>
  );
}

