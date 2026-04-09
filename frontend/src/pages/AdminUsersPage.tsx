import { useEffect, useMemo, useState } from 'react';
import { Pencil, Trash2, ShieldCheck, RefreshCw } from 'lucide-react';
import ConfirmModal from '../components/ConfirmModal';
import { useAuthSession } from '../authSession';
import { AppRoles } from '../authz';
import {
  deleteAdminUser,
  fetchAdminRoles,
  fetchAdminUsers,
  updateAdminUser,
} from '../api/AdminUsersAPI';
import type { AdminUser, UpdateAdminUserPayload } from '../types/AdminUser';

type EditFormState = {
  email: string;
  displayName: string;
  phoneNumber: string;
  selectedRole: string;
};

const emptyForm: EditFormState = {
  email: '',
  displayName: '',
  phoneNumber: '',
  selectedRole: '',
};

function normalizeUserForForm(user: AdminUser): EditFormState {
  return {
    email: user.email,
    displayName: user.displayName ?? '',
    phoneNumber: user.phoneNumber ?? '',
    selectedRole: user.roles[0] ?? '',
  };
}

export default function AdminUsersPage() {
  const { currentUser } = useAuthSession();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [availableRoles, setAvailableRoles] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [editingUser, setEditingUser] = useState<AdminUser | null>(null);
  const [form, setForm] = useState<EditFormState>(emptyForm);
  const [saving, setSaving] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<AdminUser | null>(null);
  const [deleting, setDeleting] = useState(false);

  const currentAdminEmail = (currentUser?.email ?? '').toLowerCase();

  const sortedUsers = useMemo(() => {
    return [...users].sort((a, b) => a.email.localeCompare(b.email));
  }, [users]);

  const load = async () => {
    setLoading(true);
    setError(null);

    try {
      const [usersResult, rolesResult] = await Promise.all([
        fetchAdminUsers(),
        fetchAdminRoles(),
      ]);

      setUsers(usersResult);
      setAvailableRoles(rolesResult);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load users.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const openEditModal = (user: AdminUser) => {
    setNotice(null);
    setError(null);
    setEditingUser(user);
    setForm(normalizeUserForForm(user));
  };

  const closeEditModal = () => {
    if (saving) {
      return;
    }

    setEditingUser(null);
    setForm(emptyForm);
  };

  const selectRole = (role: string) => {
    setForm((prev) => ({ ...prev, selectedRole: role }));
  };

  const saveChanges = async () => {
    if (!editingUser) {
      return;
    }

    const payload: UpdateAdminUserPayload = {
      email: form.email.trim(),
      displayName: form.displayName.trim(),
      phoneNumber: form.phoneNumber.trim(),
      roles: [form.selectedRole],
    };

    if (!payload.email) {
      setError('Email is required.');
      return;
    }

    if (!form.selectedRole) {
      setError('Exactly one role must be selected.');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const updated = await updateAdminUser(editingUser.id, payload);
      setUsers((prev) => prev.map((user) => (user.id === updated.id ? updated : user)));
      setNotice(`Updated ${updated.email}.`);
      closeEditModal();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update user.';
      setError(message);
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) {
      return;
    }

    setDeleting(true);
    setError(null);

    try {
      await deleteAdminUser(deleteTarget.id);
      setUsers((prev) => prev.filter((user) => user.id !== deleteTarget.id));
      setNotice(`Deleted ${deleteTarget.email}.`);
      setDeleteTarget(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete user.';
      setError(message);
    } finally {
      setDeleting(false);
    }
  };

  const isSelf = (user: AdminUser) => user.email.toLowerCase() === currentAdminEmail;
  const isEditingSelfAdmin = editingUser != null && isSelf(editingUser) && editingUser.roles.includes(AppRoles.Admin);

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">User Management</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Manage account details and assigned roles for all users.
          </p>
        </div>
        <button className="btn-secondary" onClick={() => void load()} disabled={loading}>
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {notice && (
        <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300">
          {notice}
        </div>
      )}

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
          {error}
        </div>
      )}

      <div className="card overflow-hidden p-0">
        {loading ? (
          <p className="p-6 text-sm text-gray-500 dark:text-gray-400">Loading users...</p>
        ) : sortedUsers.length === 0 ? (
          <p className="p-6 text-sm text-gray-500 dark:text-gray-400">No users found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="table-base">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Contact</th>
                  <th>Roles</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {sortedUsers.map((user) => (
                  <tr key={user.id}>
                    <td>
                      <div className="font-medium text-gray-900 dark:text-white">{user.displayName || 'Unspecified'}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">{user.email}</div>
                    </td>
                    <td>
                      <div>{user.phoneNumber || 'No phone'}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">{user.userName || 'No username'}</div>
                    </td>
                    <td>
                      <div className="flex flex-wrap gap-1">
                        {user.roles.map((role) => (
                          <span key={`${user.id}-${role}`} className="badge bg-orange-100 text-orange-700 dark:bg-orange-500/10 dark:text-orange-400">
                            {role}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td>
                      <div className="flex items-center justify-end gap-2">
                        <button className="btn-ghost" onClick={() => openEditModal(user)}>
                          <Pencil className="h-4 w-4" />
                          Edit
                        </button>
                        <button
                          className="btn-danger"
                          onClick={() => setDeleteTarget(user)}
                          disabled={isSelf(user)}
                          title={isSelf(user) ? 'You cannot delete your own account.' : 'Delete user'}
                        >
                          <Trash2 className="h-4 w-4" />
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {editingUser && (
        <div className="modal-overlay" onClick={closeEditModal}>
          <div className="modal-body max-w-xl" onClick={(event) => event.stopPropagation()}>
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Edit User</h2>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{editingUser.email}</p>
              </div>
              <div className="inline-flex items-center gap-2 rounded-full bg-orange-100 px-3 py-1 text-xs font-semibold text-orange-700 dark:bg-orange-500/10 dark:text-orange-400">
                <ShieldCheck className="h-3.5 w-3.5" />
                Admin Action
              </div>
            </div>

            <div className="space-y-4">
              <label className="block">
                <span className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Display Name</span>
                <input
                  type="text"
                  className="input-field"
                  value={form.displayName}
                  onChange={(event) => setForm((prev) => ({ ...prev, displayName: event.target.value }))}
                />
              </label>

              <label className="block">
                <span className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Email</span>
                <input
                  type="email"
                  className="input-field"
                  value={form.email}
                  onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
                  required
                />
              </label>

              <label className="block">
                <span className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Phone</span>
                <input
                  type="tel"
                  className="input-field"
                  value={form.phoneNumber}
                  onChange={(event) => setForm((prev) => ({ ...prev, phoneNumber: event.target.value }))}
                />
              </label>

              <fieldset>
                <legend className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">Roles</legend>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {availableRoles.map((role) => (
                    <label key={role} className="flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm dark:border-gray-700">
                      <input
                        type="radio"
                        name="selectedRole"
                        checked={form.selectedRole === role}
                        onChange={() => selectRole(role)}
                        disabled={isEditingSelfAdmin && role !== AppRoles.Admin}
                      />
                      <span>{role}</span>
                    </label>
                  ))}
                </div>
                {isEditingSelfAdmin && (
                  <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                    You cannot demote your own account from Admin.
                  </p>
                )}
              </fieldset>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button className="btn-secondary" onClick={closeEditModal} disabled={saving}>Cancel</button>
              <button className="btn-primary" onClick={saveChanges} disabled={saving}>
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        open={deleteTarget != null}
        title="Delete User Account"
        message={deleteTarget ? `Are you sure you want to delete ${deleteTarget.email}? This action cannot be undone.` : ''}
        confirmLabel="Delete User"
        loading={deleting}
        onCancel={() => {
          if (!deleting) {
            setDeleteTarget(null);
          }
        }}
        onConfirm={() => void confirmDelete()}
      />
    </div>
  );
}
