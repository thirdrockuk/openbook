import { useState } from 'react';
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
  const [bannerError, setBannerError] = useState(false);

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

  if (isLoading) return <div role="status" className="text-gray-500">Loading…</div>;
  if (!event) return <div className="text-red-500">Event not found.</div>;

  const start = new Date(event.starts_at);
  const end = new Date(event.ends_at);

  const cards = [
    {
      to: `/admin/events/${id}/orders`,
      label: 'Orders',
      stat: event.order_count,
      description: 'View and manage all bookings for this event.',
      iconBg: 'bg-sky-100',
      iconColor: 'text-sky-600',
      icon: (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
      ),
    },
    {
      to: `/admin/events/${id}/ticket-types`,
      label: 'Ticket types',
      stat: event.ticket_types.length,
      description: 'Configure ticket categories and price bands.',
      iconBg: 'bg-green-100',
      iconColor: 'text-green-600',
      icon: (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
        </svg>
      ),
    },
    {
      to: `/admin/events/${id}/attendee-report`,
      label: 'Attendee report',
      description: 'View attendees grouped by configurable age bands.',
      iconBg: 'bg-violet-100',
      iconColor: 'text-violet-600',
      icon: (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
    },
    {
      to: `/admin/events/${id}/finance-report`,
      label: 'Finance report',
      description: 'Revenue, payments, and outstanding balances.',
      iconBg: 'bg-purple-100',
      iconColor: 'text-purple-600',
      icon: (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
  ];

  return (
    <div>
      <Link to="/admin/events" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 mb-5 transition-colors">
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
        </svg>
        Back to events
      </Link>

      {/* Event header card */}
      <div className="mt-3 mb-8 bg-white border border-gray-100 rounded-xl shadow-sm overflow-hidden">
        {event.banner_image_url && !bannerError && (
          <img
            src={event.banner_image_url}
            alt=""
            className="w-full h-36 object-cover"
            onError={() => setBannerError(true)}
          />
        )}
        <div className="p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="mb-2">
                <StatusBadge status={event.status} />
              </div>
              <h1 className="text-2xl font-bold text-gray-900">{event.title}</h1>
              <p className="text-sm text-gray-500 mt-1">
                {start.toLocaleDateString('en-GB', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                {' — '}
                {end.toLocaleDateString('en-GB', { year: 'numeric', month: 'long', day: 'numeric' })}
              </p>
              {event.location && (
                <p className="text-sm text-gray-500 mt-0.5">{event.location}</p>
              )}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Link
                to={`/admin/events/${id}/edit`}
                className="inline-flex items-center bg-sky-600 text-white px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-sky-700 transition-colors focus:outline-none focus:ring-2 focus:ring-sky-500"
              >
                Edit
              </Link>
              <button
                type="button"
                onClick={handleDelete}
                className="inline-flex items-center bg-white border border-red-200 text-red-600 px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-red-50 transition-colors focus:outline-none focus:ring-2 focus:ring-red-500"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Action cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {cards.map((card) => (
          <Link
            key={card.to}
            to={card.to}
            className="flex items-center gap-4 bg-white rounded-xl border border-gray-100 p-5 hover:shadow-md transition-shadow group"
          >
            <div className={`shrink-0 p-2.5 rounded-lg ${card.iconBg} ${card.iconColor}`}>
              {card.icon}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="font-semibold text-gray-900">{card.label}</p>
                {'stat' in card && (
                  <span className="text-xs font-medium bg-sky-100 text-sky-700 px-1.5 py-0.5 rounded-full">{card.stat}</span>
                )}
              </div>
              <p className="text-sm text-gray-500 mt-0.5">{card.description}</p>
            </div>
            <svg className="h-4 w-4 text-gray-300 group-hover:text-gray-400 transition-colors shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        ))}
      </div>
    </div>
  );
}
