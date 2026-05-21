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

  if (isEditing && !initialised) return <div role="status" className="text-gray-500">Loading…</div>;

  return (
    <div className="max-w-lg">
      <div className="mb-6">
        <Link to="/admin/users" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 mb-2 transition-colors">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
          </svg>
          Back to users
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">{isEditing ? 'Edit Admin User' : 'New Admin User'}</h1>
        <p className="text-sm text-gray-500 mt-1">{isEditing ? 'Update account details' : 'Create a new admin account'}</p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white border border-gray-100 rounded-xl shadow-sm p-6 space-y-4">
        {error && (
          <div role="alert" className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
            {error}
          </div>
        )}

        <div>
          <label htmlFor="user-email" className="block text-sm font-medium text-gray-700 mb-1">Email</label>
          <input
            id="user-email"
            type="email"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            required
          />
        </div>

        <div>
          <label htmlFor="user-password" className="block text-sm font-medium text-gray-700 mb-1">
            Password{isEditing && <span className="text-gray-400 font-normal"> (leave blank to keep current)</span>}
          </label>
          <input
            id="user-password"
            type="password"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
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
            className="bg-sky-600 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-sky-700 transition-colors disabled:opacity-50"
          >
            {isEditing ? 'Save changes' : 'Create user'}
          </button>
          <Link
            to="/admin/users"
            className="border border-gray-200 px-6 py-2 rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition-colors flex items-center"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
