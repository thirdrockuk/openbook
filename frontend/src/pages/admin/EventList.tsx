import { Link } from 'react-router-dom';
import { useAdminEvents } from '../../api/admin';
import { formatDate } from '../../utils/date';
import StatusBadge from '../../components/StatusBadge';

export default function AdminEventList() {
  const { data: events, isLoading } = useAdminEvents();

  if (isLoading) return <div role="status" className="text-gray-500">Loading…</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Events</h1>
        <Link
          to="/admin/events/new"
          className="bg-sky-600 text-white px-4 py-2 rounded text-sm font-medium hover:bg-sky-700"
        >
          + New event
        </Link>
      </div>

      {!events?.length ? (
        <p className="text-gray-500">No events yet.</p>
      ) : (
        <div className="bg-white rounded-lg border overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
              <tr>
                <th className="px-4 py-3 text-left">Title</th>
                <th className="px-4 py-3 text-left">Date</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-left">Ticket types</th>
                <th className="px-4 py-3 text-left">Orders</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y">
              {events.map((event) => (
                <tr key={event.id}>
                  <td className="px-4 py-3 font-medium text-gray-900">{event.title}</td>
                  <td className="px-4 py-3 text-gray-500">
                    {formatDate(event.starts_at)}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={event.status} />
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {event.ticket_types.length}
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {event.order_count}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      to={`/admin/events/${event.id}`}
                      className="inline-block bg-sky-600 text-white px-3 py-1.5 rounded text-xs font-medium hover:bg-sky-700 focus:outline-none focus:ring-2 focus:ring-sky-500"
                    >
                      Manage event
                    </Link>
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
