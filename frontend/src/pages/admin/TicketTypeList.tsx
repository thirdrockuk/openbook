import { Link, useParams } from 'react-router-dom';
import { useAdminTicketTypes } from '../../api/admin';
import { apiClient } from '../../api/client';
import { useQueryClient } from '@tanstack/react-query';
import { formatPence } from '../../utils/currency';

export default function AdminTicketTypeList() {
  const { id: eventId } = useParams<{ id: string }>();
  const qc = useQueryClient();
  const { data: ticketTypes, isLoading } = useAdminTicketTypes(eventId);

  async function handleDelete(tid: string) {
    if (!confirm('Delete this ticket type? This cannot be undone.')) return;
    try {
      await apiClient.delete(`/api/admin/events/${eventId}/ticket-types/${tid}`);
      qc.invalidateQueries({ queryKey: ['admin', 'events', eventId, 'ticket-types'] });
      qc.invalidateQueries({ queryKey: ['admin', 'events', eventId] });
      qc.invalidateQueries({ queryKey: ['admin', 'events'] });
    } catch {
      alert('Failed to delete ticket type.');
    }
  }

  if (isLoading) return <div role="status" className="text-gray-500">Loading…</div>;

  return (
    <div>
      <div className="flex items-start justify-between mb-6">
        <div>
          <Link to={`/admin/events/${eventId}`} className="text-sm text-sky-600 hover:underline">
            ← Back to event
          </Link>
          <h1 className="text-2xl font-bold text-gray-900 mt-1">Ticket types</h1>
        </div>
        <Link
          to={`/admin/events/${eventId}/ticket-types/new`}
          className="bg-sky-600 text-white px-4 py-2 rounded text-sm font-medium hover:bg-sky-700"
        >
          + New ticket type
        </Link>
      </div>

      {!ticketTypes?.length ? (
        <p className="text-gray-500">No ticket types yet.</p>
      ) : (
        <div className="space-y-4">
          {[...(ticketTypes ?? [])].sort((a, b) => a.sort_order - b.sort_order).map((tt) => (
            <div key={tt.id} className="bg-white border rounded-lg p-5">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-gray-900">{tt.name}</h3>
                    <span
                      className={`px-2 py-0.5 rounded text-xs font-medium ${
                        tt.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                      }`}
                    >
                      {tt.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  {tt.description && (
                    <p className="text-sm text-gray-500 mt-1">{tt.description}</p>
                  )}
                  <p className="text-xs text-gray-400 mt-1">
                    Inventory:{' '}
                    {tt.inventory_total != null
                      ? `${tt.available ?? '?'} available / ${tt.inventory_total} total`
                      : 'Unlimited'}
                    {' · '}Sort order: {tt.sort_order}
                  </p>
                </div>
                <div className="flex gap-2 text-sm shrink-0">
                  <Link
                    to={`/admin/events/${eventId}/ticket-types/${tt.id}/edit`}
                    className="inline-block bg-sky-600 text-white px-3 py-1.5 rounded text-xs font-medium hover:bg-sky-700 focus:outline-none focus:ring-2 focus:ring-sky-500"
                  >
                    Edit
                  </Link>
                  <button
                    type="button"
                    onClick={() => handleDelete(tt.id)}
                    className="inline-block bg-red-600 text-white px-3 py-1.5 rounded text-xs font-medium hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500"
                  >
                    Delete
                  </button>
                </div>
              </div>

              {tt.price_bands.length > 0 && (
                <div className="mt-3 border-t pt-3">
                  <div className="grid grid-cols-6 gap-2 text-xs font-medium text-gray-500 uppercase mb-1">
                    <span>Band</span>
                    <span>Min age</span>
                    <span>Max age</span>
                    <span>Price</span>
                    <span>Venue fee</span>
                    <span>Qualifier</span>
                  </div>
                  {[...tt.price_bands]
                    .sort((a, b) => b.age_min - a.age_min)
                    .map((band) => (
                      <div key={band.id} className="grid grid-cols-6 gap-2 text-sm text-gray-700 py-0.5">
                        <span>{band.label}</span>
                        <span>{band.age_min}</span>
                        <span>{band.age_max}</span>
                        <span>{formatPence(band.price_pence)}</span>
                        <span>{formatPence(band.venue_fee_pence)}</span>
                        <span>{band.qualifier ?? '—'}</span>
                      </div>
                    ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
