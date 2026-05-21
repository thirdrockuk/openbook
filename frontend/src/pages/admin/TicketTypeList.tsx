import { Link, useParams } from 'react-router-dom';
import { useAdminEvent, useAdminTicketTypes } from '../../api/admin';
import { apiClient } from '../../api/client';
import { useQueryClient } from '@tanstack/react-query';
import { formatPence } from '../../utils/currency';

export default function AdminTicketTypeList() {
  const { id: eventId } = useParams<{ id: string }>();
  const qc = useQueryClient();
  const { data: event } = useAdminEvent(eventId);
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
      <div className="flex items-start justify-between mb-8">
        <div>
          <Link
            to={`/admin/events/${eventId}`}
            className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 mb-2 transition-colors"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
            </svg>
            Back to event
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">{event?.title}</h1>
          <div className="flex items-center gap-2 mt-1">
            <p className="text-sm text-gray-500">Ticket types</p>
            <span className="text-xs font-medium bg-sky-100 text-sky-700 px-1.5 py-0.5 rounded-full">{ticketTypes?.length ?? 0}</span>
          </div>
        </div>
        <Link
          to={`/admin/events/${eventId}/ticket-types/new`}
          className="inline-flex items-center gap-1.5 bg-sky-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-sky-700 transition-colors"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          New ticket type
        </Link>
      </div>

      {!ticketTypes?.length ? (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-12 text-center">
          <div className="mx-auto h-12 w-12 rounded-full bg-gray-100 flex items-center justify-center mb-4">
            <svg className="h-6 w-6 text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 6v.75m0 3v.75m0 3v.75m0 3V18m-9-5.25h5.25M7.5 15h3M3.375 5.25c-.621 0-1.125.504-1.125 1.125v3.026a2.999 2.999 0 010 5.198v3.026c0 .621.504 1.125 1.125 1.125h17.25c.621 0 1.125-.504 1.125-1.125v-3.026a3 3 0 010-5.198V6.375c0-.621-.504-1.125-1.125-1.125H3.375z" />
            </svg>
          </div>
          <p className="text-gray-900 font-semibold mb-1">No ticket types yet</p>
          <p className="text-sm text-gray-500 mb-5">Add your first ticket type to start selling.</p>
          <Link
            to={`/admin/events/${eventId}/ticket-types/new`}
            className="inline-flex items-center gap-1.5 bg-sky-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-sky-700 transition-colors"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            New ticket type
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {[...(ticketTypes ?? [])].sort((a, b) => a.sort_order - b.sort_order).map((tt) => (
            <div key={tt.id} className="bg-white border border-gray-100 rounded-xl shadow-sm p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold text-gray-900">{tt.name}</h3>
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        tt.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                      }`}
                    >
                      <span className={`h-1.5 w-1.5 rounded-full ${tt.is_active ? 'bg-green-500' : 'bg-gray-400'}`} />
                      {tt.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  {tt.description && (
                    <p className="text-sm text-gray-500 mt-1">{tt.description}</p>
                  )}
                  <p className="text-xs text-gray-400 mt-1.5">
                    Inventory:{' '}
                    {tt.inventory_total != null
                      ? `${tt.available ?? '?'} available / ${tt.inventory_total} total`
                      : 'Unlimited'}
                    {' · '}Sort order: {tt.sort_order}
                  </p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <Link
                    to={`/admin/events/${eventId}/ticket-types/${tt.id}/edit`}
                    className="inline-flex items-center bg-sky-600 text-white px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-sky-700 transition-colors focus:outline-none focus:ring-2 focus:ring-sky-500"
                  >
                    Edit
                  </Link>
                  <button
                    type="button"
                    onClick={() => handleDelete(tt.id)}
                    className="inline-flex items-center border border-red-200 text-red-600 bg-white px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-red-50 transition-colors focus:outline-none focus:ring-2 focus:ring-red-500"
                  >
                    Delete
                  </button>
                </div>
              </div>

              {tt.price_bands.length > 0 && (
                <div className="mt-4 border-t border-gray-100 pt-4">
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="text-gray-400 uppercase tracking-wide font-semibold border-b border-gray-100">
                          <th className="pb-2 text-left">Band</th>
                          <th className="pb-2 text-left">Min age</th>
                          <th className="pb-2 text-left">Max age</th>
                          <th className="pb-2 text-right">Price</th>
                          <th className="pb-2 text-right">Venue fee</th>
                          <th className="pb-2 text-left pl-4">Qualifier</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {[...tt.price_bands]
                          .sort((a, b) => b.age_min - a.age_min)
                          .map((band) => (
                            <tr key={band.id} className="text-gray-700">
                              <td className="py-1.5 font-medium text-gray-900">{band.label}</td>
                              <td className="py-1.5">{band.age_min}</td>
                              <td className="py-1.5">{band.age_max}</td>
                              <td className="py-1.5 text-right">{formatPence(band.price_pence)}</td>
                              <td className="py-1.5 text-right">{formatPence(band.venue_fee_pence)}</td>
                              <td className="py-1.5 pl-4">{band.qualifier ?? '—'}</td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
