import { Link } from 'react-router-dom';
import { useAdminUsers, useCurrentAdminUser } from '../../api/admin';
import { apiClient } from '../../api/client';
import { useQueryClient } from '@tanstack/react-query';
import { formatDate } from '../../utils/date';

export default function AdminUserList() {
  const { data: users, isLoading } = useAdminUsers();
  const { data: currentUser } = useCurrentAdminUser();
  const qc = useQueryClient();

  async function handleDelete(id: string) {
    if (!confirm('Delete this admin user? This cannot be undone.')) return;
    try {
      await apiClient.delete(`/api/admin/users/${id}`);
      qc.invalidateQueries({ queryKey: ['admin', 'users'] });
    } catch {
      alert('Failed to delete user.');
    }
  }

  if (isLoading) return <div role="status" className="text-gray-500">Loading…</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold text-gray-900">Admin users</h1>
            <span className="text-sm font-medium bg-sky-100 text-sky-700 px-2 py-0.5 rounded-full">{users?.length ?? 0}</span>
          </div>
        </div>
        <Link
          to="/admin/users/new"
          className="inline-flex items-center gap-1.5 bg-sky-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-sky-700 transition-colors"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          New user
        </Link>
      </div>

      {!users?.length ? (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-12 text-center">
          <div className="mx-auto h-12 w-12 rounded-full bg-gray-100 flex items-center justify-center mb-4">
            <svg className="h-6 w-6 text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
            </svg>
          </div>
          <p className="text-gray-900 font-semibold mb-1">No users found</p>
          <p className="text-sm text-gray-500 mb-5">Add an admin user to get started.</p>
          <Link
            to="/admin/users/new"
            className="inline-flex items-center gap-1.5 bg-sky-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-sky-700 transition-colors"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            New user
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Email</th>
                <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Created</th>
                <th className="px-5 py-3.5" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-4 font-medium text-gray-900">
                    {user.email}
                    {currentUser?.email === user.email && (
                      <span className="ml-2 text-xs text-sky-500 font-normal">(you)</span>
                    )}
                  </td>
                  <td className="px-5 py-4">
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        user.is_active
                          ? 'bg-green-100 text-green-700'
                          : 'bg-gray-100 text-gray-500'
                      }`}
                    >
                      <span className={`h-1.5 w-1.5 rounded-full ${user.is_active ? 'bg-green-500' : 'bg-gray-400'}`} />
                      {user.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-gray-500">{formatDate(user.created_at)}</td>
                  <td className="px-5 py-4 text-right space-x-2">
                    <Link
                      to={`/admin/users/${user.id}/edit`}
                      className="inline-flex items-center gap-1 bg-sky-600 text-white px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-sky-700 transition-colors focus:outline-none focus:ring-2 focus:ring-sky-500"
                    >
                      Edit
                      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                      </svg>
                    </Link>
                    {currentUser?.email !== user.email && (
                      <button
                        type="button"
                        onClick={() => handleDelete(user.id)}
                        className="inline-flex items-center bg-white border border-red-200 text-red-600 px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-red-50 transition-colors focus:outline-none focus:ring-2 focus:ring-red-500"
                      >
                        Delete
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
