import { API_BASE_URL } from './config';
import { apiFetch } from './http';
import type { AdminUser, UpdateAdminUserPayload } from '../types/AdminUser';

const BASE_URL = `${API_BASE_URL}/AdminUsers`;

async function extractErrorMessage(response: Response, fallback: string) {
  try {
    const data = await response.json();
    if (Array.isArray(data) && data[0]?.description) {
      return data[0].description as string;
    }

    if (Array.isArray(data) && data[0]?.Description) {
      return data[0].Description as string;
    }

    if (typeof data?.message === 'string') {
      return data.message;
    }

    if (typeof data?.Message === 'string') {
      return data.Message;
    }
  } catch {
    // Ignore JSON parse failures and use fallback message.
  }

  return fallback;
}

export async function fetchAdminUsers(): Promise<AdminUser[]> {
  const response = await apiFetch(BASE_URL, { method: 'GET' });
  if (!response.ok) {
    throw new Error(await extractErrorMessage(response, `Failed to fetch users (${response.status}).`));
  }

  return response.json();
}

export async function fetchAdminRoles(): Promise<string[]> {
  const response = await apiFetch(`${BASE_URL}/roles`, { method: 'GET' });
  if (!response.ok) {
    throw new Error(await extractErrorMessage(response, `Failed to fetch roles (${response.status}).`));
  }

  return response.json();
}

export async function updateAdminUser(userId: string, payload: UpdateAdminUserPayload): Promise<AdminUser> {
  const response = await apiFetch(`${BASE_URL}/${userId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(await extractErrorMessage(response, `Failed to update user (${response.status}).`));
  }

  return response.json();
}

export async function deleteAdminUser(userId: string): Promise<void> {
  const response = await apiFetch(`${BASE_URL}/${userId}`, {
    method: 'DELETE',
  });

  if (!response.ok) {
    throw new Error(await extractErrorMessage(response, `Failed to delete user (${response.status}).`));
  }
}
