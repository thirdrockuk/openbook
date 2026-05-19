import { Link, useParams, useNavigate } from 'react-router-dom';
import { useAdminEvent } from '../../api/admin';
import { apiClient } from '../../api/client';
import { useQueryClient } from '@tanstack/react-query';
import StatusBadge from '../../components/StatusBadge';

export default function AdminEventHub() {
  const { id } = useParams<{ id: string }>();
  const { data: event, isLoading } = useAdminEvent(id);
  const qc = useQueryClient();
  const navigate = useNavigate();

  async function handleDelete() {
    if (!confirm('Delete this event? This cannot be undone.')) return;
    try {
      await apiClient.delete(`/api/admin/events/${id}`);
      qc.invalidateQueries({ queryKey: ['admin', 'events'] });
      navigate('/admin/events');
    } catch {
      alert('Failed to delete event.');
    }
  }

  if (isLoading) return <div className="text-gray-500">Loading…</div>;
  if (!event) return <div className="text-red-500">Event not found.</div>;

  const start = new Date(event.starts_at);
  const end = new Date(event.ends_at);

  const cards = [
    {
      to: `/admin/events/${id}/orders`,
      label: 'Orders',
      description: 'View and manage all bookings for this event.',
      colour: 'text-sky-600 border-sky-200 hover:bg-sky-50',
      icon: (
        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
      ),
    },
    {
      to: `/admin/events/${id}/ticket-types`,
      label: 'Ticket types',
      description: 'Configure ticket categories and price bands.',
      colour: 'text-green-600 border-green-200 hover:bg-green-50',
      icon: (
        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
        </svg>
      ),
    },
    {
      to: `/admin/events/${id}/attendee-report`,
      label: 'Attendee report',
      description: 'View attendees grouped by configurable age bands.',
      colour: 'text-sky-600 border-sky-200 hover:bg-sky-50',
      icon: (
        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
    },
    {
      to: `/admin/events/${id}/finance-report`,
      label: 'Finance report',
      description: 'Revenue, payments, and outstanding balances.',
      colour: 'text-purple-600 border-purple-200 hover:bg-purple-50',
      icon: (
        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
  ];

  return (
    <div>
      <Link to="/admin/events" className="text-sm text-sky-600 hover:underline">
        ← Back to events
      </Link>

      {/* Event summary */}
      <div className="mt-3 mb-8 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{event.title}</h1>
          <p className="text-sm text-gray-500 mt-1">
            {start.toLocaleDateString('en-GB', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            {' — '}
            {end.toLocaleDateString('en-GB', { year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
          {event.location && (
            <p className="text-sm text-gray-500">{event.location}</p>
          )}
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <StatusBadge status={event.status} />
          <Link
            to={`/admin/events/${id}/edit`}
            className="inline-block bg-sky-600 text-white px-3 py-1.5 rounded text-xs font-medium hover:bg-sky-700 focus:outline-none focus:ring-2 focus:ring-sky-500"
          >
            Edit
          </Link>
          <button
            onClick={handleDelete}
            className="inline-block bg-red-600 text-white px-3 py-1.5 rounded text-xs font-medium hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500"
          >
            Delete
          </button>
        </div>
      </div>

      {/* Action cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {cards.map((card) => (
          <Link
            key={card.to}
            to={card.to}
            className={`flex items-start gap-4 rounded-lg border p-5 transition ${card.colour}`}
          >
            <div className="mt-0.5 shrink-0">{card.icon}</div>
            <div>
              <p className="font-semibold">{card.label}</p>
              <p className="text-sm text-gray-500 mt-0.5">{card.description}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
