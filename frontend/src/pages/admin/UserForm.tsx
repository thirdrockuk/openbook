import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { apiClient } from '../../api/client';
import { useAdminUser } from '../../api/admin';
import { useQueryClient } from '@tanstack/react-query';

export default function AdminUserForm() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEditing = Boolean(id);
  const qc = useQueryClient();

  const { data: existing } = useAdminUser(id);

  const [form, setForm] = useState({
    email: '',
    password: '',
    is_active: true,
  });
  const [initialised, setInitialised] = useState(!isEditing);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (existing && !initialised) {
      setForm({ email: existing.email, password: '', is_active: existing.is_active });
      setInitialised(true);
    }
  }, [existing, initialised]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      const payload: Record<string, unknown> = {
        email: form.email,
        is_active: form.is_active,
      };
      if (form.password) payload.password = form.password;

      if (isEditing) {
        await apiClient.put(`/api/admin/users/${id}`, payload);
      } else {
        if (!form.password) { setError('Password is required'); return; }
        await apiClient.post('/api/admin/users', payload);
      }
      await qc.invalidateQueries({ queryKey: ['admin', 'users'] });
      navigate('/admin/users');
    } catch (err: unknown) {
      const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      setError(detail ?? 'Something went wrong');
    }
  }

  if (isEditing && !initialised) return <div className="text-gray-500">Loading…</div>;

  return (
    <div className="max-w-lg">
      <Link to="/admin/users" className="text-sm text-sky-600 hover:underline">
        ← Back to Users
      </Link>
      <h1 className="text-2xl font-bold text-gray-900 mt-2 mb-6">
        {isEditing ? 'Edit Admin User' : 'New Admin User'}
      </h1>

      <form onSubmit={handleSubmit} className="bg-white border rounded-lg p-6 space-y-4">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded px-4 py-3">
            {error}
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
          <input
            type="email"
            className="w-full border rounded px-3 py-2 text-sm"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Password{isEditing && <span className="text-gray-400 font-normal"> (leave blank to keep current)</span>}
          </label>
          <input
            type="password"
            className="w-full border rounded px-3 py-2 text-sm"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            minLength={8}
            required={!isEditing}
            autoComplete="new-password"
          />
        </div>

        <div className="flex items-center gap-2">
          <input
            id="is_active"
            type="checkbox"
            checked={form.is_active}
            onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
            className="rounded"
          />
          <label htmlFor="is_active" className="text-sm text-gray-700">Active</label>
        </div>

        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            className="bg-sky-600 text-white px-6 py-2 rounded font-medium hover:bg-sky-700"
          >
            {isEditing ? 'Save Changes' : 'Create User'}
          </button>
          <Link
            to="/admin/users"
            className="border border-gray-300 px-6 py-2 rounded text-gray-700 hover:bg-gray-50 text-sm flex items-center"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
