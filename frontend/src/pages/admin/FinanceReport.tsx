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
    return <div role="status" className="text-gray-500">Loading...</div>;
  }

  return (
    <div>
      <Link to={`/admin/events/${eventId}`} className="text-sm text-sky-600 hover:underline">
        ← Back to event
      </Link>
      <div className="flex items-center justify-between mt-1 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Finance report</h1>
          <p className="text-sm text-gray-500 mt-1">
            {event?.title} — all non-cancelled bookings with delegate lists and finance totals.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-6">
        <SummaryCard label="Orders" value={String(sortedOrders.length)} />
        <SummaryCard label="Price" value={formatPence(totals.pricePence)} />
        <SummaryCard label="Amount paid" value={formatPence(totals.amountPaidPence)} />
        <SummaryCard label="Outstanding" value={formatPence(totals.outstandingPence)} />
        <SummaryCard label="Venue fee" value={formatPence(totals.venueFeePence)} />
        <SummaryCard label="Event fee" value={formatPence(totals.eventFeePence)} />
      </div>

      {!sortedOrders.length ? (
        <p className="text-gray-500">No non-cancelled bookings yet.</p>
      ) : (
        <div className="bg-white rounded-lg border overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
              <tr>
                <th className="px-4 py-3 text-left">Booking</th>
                <th className="px-4 py-3 text-left">Delegates</th>
                <th className="px-4 py-3 text-right">Price</th>
                <th className="px-4 py-3 text-right">Amount paid</th>
                <th className="px-4 py-3 text-right">Outstanding</th>
                <th className="px-4 py-3 text-right">Venue fee</th>
                <th className="px-4 py-3 text-right">Event fee</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {sortedOrders.map((order) => {
                const venueFeePence = sumVenueFeePence(order);
                const eventFeePence = order.total_pence - venueFeePence;
                const outstandingPence = Math.max(0, order.balance_pence);

                return (
                  <tr key={order.id} className="align-top">
                    <td className="px-4 py-3">
                      <div className="font-mono text-xs text-gray-900">{order.order_number}</div>
                      <div className="font-medium text-gray-900">{order.booker_name}</div>
                      <div className="text-xs text-gray-500">{order.booker_email}</div>
                      <div className="text-xs text-gray-400">{formatDateTime(order.created_at)}</div>
                      <div className="mt-2">
                        <StatusBadge status={order.status} />
                      </div>
                      <Link
                        to={`/admin/orders/${order.id}`}
                        className="inline-block mt-2 text-sky-600 hover:underline text-xs"
                      >
                        Open booking
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <div className="space-y-1">
                        {order.order_items.map((item) => (
                          <div key={item.id} className="text-xs text-gray-700">
                            <span className="font-medium text-gray-900">{item.attendee_name}</span>
                            <span className="text-gray-500"> · {formatDate(item.attendee_dob)}</span>
                            {item.price_band_label && (
                              <span className="text-gray-500"> · {item.price_band_label}</span>
                            )}
                          </div>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right font-medium">{formatPence(order.total_pence)}</td>
                    <td className="px-4 py-3 text-right">{formatPence(order.amount_paid_pence)}</td>
                    <td className={`px-4 py-3 text-right font-medium ${outstandingPence > 0 ? 'text-red-600' : 'text-green-700'}`}>
                      {formatPence(outstandingPence)}
                    </td>
                    <td className="px-4 py-3 text-right">{formatPence(venueFeePence)}</td>
                    <td className="px-4 py-3 text-right">{formatPence(eventFeePence)}</td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="bg-gray-50">
                <td className="px-4 py-3 font-semibold text-gray-900">Totals</td>
                <td className="px-4 py-3" />
                <td className="px-4 py-3 text-right font-semibold text-gray-900">{formatPence(totals.pricePence)}</td>
                <td className="px-4 py-3 text-right font-semibold text-gray-900">{formatPence(totals.amountPaidPence)}</td>
                <td className="px-4 py-3 text-right font-semibold text-gray-900">{formatPence(totals.outstandingPence)}</td>
                <td className="px-4 py-3 text-right font-semibold text-gray-900">{formatPence(totals.venueFeePence)}</td>
                <td className="px-4 py-3 text-right font-semibold text-gray-900">{formatPence(totals.eventFeePence)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white border rounded-lg p-4">
      <p className="text-xs text-gray-500 uppercase">{label}</p>
      <p className="text-lg font-semibold text-gray-900 mt-1">{value}</p>
    </div>
  );
}
