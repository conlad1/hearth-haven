import { API_BASE_URL } from './config';

export interface UserProfile {
  supporterId: number | null;
  supporterType: string;
  displayName: string;
  organizationName: string | null;
  firstName: string | null;
  lastName: string | null;
  relationshipType: string;
  region: string | null;
  country: string | null;
  email: string | null;
  phone: string | null;
  status: string;
  firstDonationDate: string | null;
  acquisitionChannel: string | null;
  createdAt: string | null;
}

export const fetchMyProfile = async (): Promise<UserProfile> => {
  const res = await fetch(`${API_BASE_URL}/api/Profile/me`, {
    credentials: 'include',
  });

  if (!res.ok) throw new Error(`Failed to fetch profile: ${res.status}`);
  return res.json();
};

export const updateMyProfile = async (profile: UserProfile): Promise<UserProfile> => {
  const res = await fetch(`${API_BASE_URL}/api/Profile/me`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(profile),
  });

  if (!res.ok) {
    const message = await res.text();
    throw new Error(message || `Failed to update profile: ${res.status}`);
  }

  return res.json();
};

export const changeMyPassword = async (currentPassword: string, newPassword: string): Promise<void> => {
  const res = await fetch(`${API_BASE_URL}/api/Auth/change-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ currentPassword, newPassword }),
  });

  if (!res.ok) {
    const message = await res.text();
    throw new Error(message || `Failed to change password: ${res.status}`);
  }
};
