import { useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useAdminEvent, useAdminOrdersPage } from '../../api/admin';
import { formatPence } from '../../utils/currency';
import { formatDate, formatDateTime } from '../../utils/date';
import StatusBadge from '../../components/StatusBadge';

function sumVenueFeePence(order: { order_items: { venue_fee_pence: number }[] }): number {
  return order.order_items.reduce((total, item) => total + item.venue_fee_pence, 0);
}



export default function AdminFinanceReport() {
  const { id: eventId } = useParams<{ id: string }>();
  const { data: event, isLoading: isEventLoading } = useAdminEvent(eventId);
  const { data: ordersPage, isLoading: isOrdersLoading } = useAdminOrdersPage(
    eventId ?? '',
    1,
    10000,
    'desc',
    'created_at',
    '',
    true,
  );
  const orders = ordersPage?.items;

  const financeOrders = useMemo(() => {
    return (orders ?? []).filter((order) => order.status !== 'cancelled');
  }, [orders]);

  const sortedOrders = useMemo(() => {
    return [...financeOrders].sort((a, b) => {
      const aTime = new Date(a.created_at).getTime();
      const bTime = new Date(b.created_at).getTime();
      return bTime - aTime;
    });
  }, [financeOrders]);

  const totals = useMemo(() => {
    return sortedOrders.reduce(
      (acc, order) => {
        const venueFeePence = sumVenueFeePence(order);
        const eventFeePence = order.total_pence - venueFeePence;
        acc.pricePence += order.total_pence;
        acc.amountPaidPence += order.amount_paid_pence;
        acc.outstandingPence += Math.max(0, order.balance_pence);
        acc.venueFeePence += venueFeePence;
        acc.eventFeePence += eventFeePence;
        return acc;
      },
      {
        pricePence: 0,
        amountPaidPence: 0,
        outstandingPence: 0,
        venueFeePence: 0,
        eventFeePence: 0,
      }
    );
  }, [sortedOrders]);

  if (isEventLoading || isOrdersLoading) {
    return <div role="status" className="text-gray-500">Loading…</div>;
  }

  return (
    <div>
      <Link
        to={`/admin/events/${eventId}`}
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 mb-5 transition-colors"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
        </svg>
        Back to event
      </Link>

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">{event?.title}</h1>
        <p className="text-sm text-gray-500 mt-1">Finance report — non-cancelled bookings with delegate lists and finance totals.</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-6">
        <SummaryCard label="Orders" value={String(sortedOrders.length)} />
        <SummaryCard label="Price" value={formatPence(totals.pricePence)} />
        <SummaryCard label="Amount paid" value={formatPence(totals.amountPaidPence)} />
        <SummaryCard label="Outstanding" value={formatPence(totals.outstandingPence)} highlight={totals.outstandingPence > 0} />
        <SummaryCard label="Venue fee" value={formatPence(totals.venueFeePence)} />
        <SummaryCard label="Event fee" value={formatPence(totals.eventFeePence)} />
      </div>

      {!sortedOrders.length ? (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-12 text-center">
          <div className="mx-auto h-12 w-12 rounded-full bg-gray-100 flex items-center justify-center mb-4">
            <svg className="h-6 w-6 text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" />
            </svg>
          </div>
          <p className="text-gray-900 font-semibold mb-1">No non-cancelled bookings yet</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Booking</th>
                <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Delegates</th>
                <th className="px-5 py-3.5 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">Price</th>
                <th className="px-5 py-3.5 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">Paid</th>
                <th className="px-5 py-3.5 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">Outstanding</th>
                <th className="px-5 py-3.5 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">Venue fee</th>
                <th className="px-5 py-3.5 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">Event fee</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {sortedOrders.map((order) => {
                const venueFeePence = sumVenueFeePence(order);
                const eventFeePence = order.total_pence - venueFeePence;
                const outstandingPence = Math.max(0, order.balance_pence);

                return (
                  <tr key={order.id} className="align-top hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-4">
                      <div className="font-mono text-xs text-gray-500">{order.order_number}</div>
                      <div className="font-medium text-gray-900">{order.booker_name}</div>
                      <div className="text-xs text-gray-500">{order.booker_email}</div>
                      <div className="text-xs text-gray-400 mt-0.5">{formatDateTime(order.created_at)}</div>
                      <div className="mt-2">
                        <StatusBadge status={order.status} />
                      </div>
                      <Link
                        to={`/admin/orders/${order.id}`}
                        className="inline-flex items-center gap-1 mt-2 text-sky-600 hover:underline text-xs"
                      >
                        Open booking
                        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                        </svg>
                      </Link>
                    </td>
                    <td className="px-5 py-4">
                      <div className="space-y-0.5">
                        {order.order_items.map((item) => (
                          <div key={item.id} className="text-xs text-gray-700">
                            <span className="font-medium text-gray-900">{item.attendee_name}</span>
                            <span className="text-gray-400"> · {formatDate(item.attendee_dob)}</span>
                            {item.price_band_label && (
                              <span className="text-gray-400"> · {item.price_band_label}</span>
                            )}
                          </div>
                        ))}
                      </div>
                    </td>
                    <td className="px-5 py-4 text-right font-medium">{formatPence(order.total_pence)}</td>
                    <td className="px-5 py-4 text-right text-gray-600">{formatPence(order.amount_paid_pence)}</td>
                    <td className={`px-5 py-4 text-right font-medium ${outstandingPence > 0 ? 'text-red-600' : 'text-green-700'}`}>
                      {formatPence(outstandingPence)}
                    </td>
                    <td className="px-5 py-4 text-right text-gray-600">{formatPence(venueFeePence)}</td>
                    <td className="px-5 py-4 text-right text-gray-600">{formatPence(eventFeePence)}</td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-gray-200 bg-gray-50">
                <td className="px-5 py-3 font-semibold text-gray-900 text-sm">Totals</td>
                <td className="px-5 py-3" />
                <td className="px-5 py-3 text-right font-semibold text-gray-900">{formatPence(totals.pricePence)}</td>
                <td className="px-5 py-3 text-right font-semibold text-gray-900">{formatPence(totals.amountPaidPence)}</td>
                <td className="px-5 py-3 text-right font-semibold text-gray-900">{formatPence(totals.outstandingPence)}</td>
                <td className="px-5 py-3 text-right font-semibold text-gray-900">{formatPence(totals.venueFeePence)}</td>
                <td className="px-5 py-3 text-right font-semibold text-gray-900">{formatPence(totals.eventFeePence)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
}

function SummaryCard({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className={`bg-white border rounded-xl shadow-sm p-4 ${highlight ? 'border-red-100' : 'border-gray-100'}`}>
      <p className={`text-xs font-semibold uppercase tracking-wide mb-1 ${highlight ? 'text-red-500' : 'text-gray-400'}`}>{label}</p>
      <p className={`text-lg font-bold ${highlight ? 'text-red-600' : 'text-gray-900'}`}>{value}</p>
    </div>
  );
}
