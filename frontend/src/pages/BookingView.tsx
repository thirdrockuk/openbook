import { useParams } from 'react-router-dom';
import { useBookingView } from '../api/orders';
import { formatPence } from '../utils/currency';
import { formatDate } from '../utils/date';

const METHOD_LABELS: Record<string, string> = {
  bank_transfer: 'Bank transfer',
  card: 'Card payment',
  cash: 'Cash',
  cheque: 'Cheque',
  other: 'Other',
};

const STATUS_LABELS: Record<string, { label: string; colour: string }> = {
  pending:   { label: 'Pending',   colour: 'bg-yellow-100 text-yellow-700' },
  confirmed: { label: 'Confirmed', colour: 'bg-green-100 text-green-700' },
  cancelled: { label: 'Cancelled', colour: 'bg-red-100 text-red-600' },
  refunded:  { label: 'Refunded',  colour: 'bg-purple-100 text-purple-700' },
  expired:   { label: 'Expired',   colour: 'bg-white text-gray-700' },
};

export default function BookingView() {
  const { token } = useParams<{ token: string }>();
  const { data: booking, isLoading, isError } = useBookingView(token);

  if (isLoading) return <div role="status" className="text-center py-16 text-gray-500">Loading…</div>;
  if (isError || !booking) {
    return (
      <div className="max-w-lg mx-auto py-16 text-center">
        <p className="text-2xl mb-2">🤔</p>
        <p className="text-gray-700 font-semibold">Booking not found</p>
        <p className="text-gray-700 text-sm mt-1">This link may be invalid or expired.</p>
      </div>
    );
  }

  const statusInfo = STATUS_LABELS[booking.status] ?? { label: booking.status, colour: 'bg-white text-gray-700' };
  const eventStart = new Date(booking.event.starts_at);

  return (
    <div className="max-w-2xl mx-auto py-10 px-4">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{booking.event.title}</h1>
          <p className="text-gray-700 text-sm mt-1">
            {eventStart.toLocaleDateString('en-GB', {
              weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
            })}
          </p>
          <p className="text-gray-700 text-sm">{booking.event.location}</p>
        </div>
        <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusInfo.colour}`}>
          {statusInfo.label}
        </span>
      </div>

      <div className="bg-white border border-gray-100 rounded-xl shadow-sm p-5 mb-4">
        <p className="text-sm text-gray-700 mb-1">Booking reference</p>
        <p className="font-mono text-lg font-bold text-gray-900">{booking.order_number}</p>
        <p className="text-sm text-gray-700 mt-1">Name on booking: {booking.booker_name}</p>
      </div>

      <div className="bg-white border border-gray-100 rounded-xl shadow-sm p-5 mb-4">
        <h2 className="font-semibold text-gray-900 mb-3">Attendees</h2>
        <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-700 border-b text-xs uppercase">
              <th className="pb-2">Name</th>
              <th className="pb-2">Band</th>
              <th className="pb-2 text-right">Price</th>
            </tr>
          </thead>
          <tbody>
            {booking.order_items.map((item) => (
              <tr key={item.id} className="border-b">
                <td className="py-2">{item.attendee_name}</td>
                <td className="py-2 text-gray-700">
                  {item.price_band_label ?? '—'}
                  {item.price_band_qualifier && (
                    <span className="ml-1 px-1.5 py-0.5 bg-indigo-100 text-indigo-700 rounded text-xs">
                      {item.price_band_qualifier}
                    </span>
                  )}
                </td>
                <td className="py-2 text-right">{formatPence(item.price_pence)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={2} className="pt-3 font-semibold">Total</td>
              <td className="pt-3 font-semibold text-right">{formatPence(booking.total_pence)}</td>
            </tr>
          </tfoot>
        </table>
        </div>
      </div>

      <div className="bg-white border border-gray-100 rounded-xl shadow-sm p-5">
        <h2 className="font-semibold text-gray-900 mb-3">Payments</h2>

        {booking.payments.length === 0 ? (
          <p className="text-sm text-gray-700 mb-3">No payments recorded yet.</p>
        ) : (
          <div className="overflow-x-auto">
          <table className="w-full text-sm mb-3">
            <thead>
              <tr className="text-left text-gray-700 border-b text-xs uppercase">
                <th className="pb-2">Date</th>
                <th className="pb-2">Method</th>
                <th className="pb-2">Reference</th>
                <th className="pb-2 text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {booking.payments.map((p) => (
                <tr key={p.id} className="border-b">
                  <td className="py-2 text-gray-700 whitespace-nowrap">
                    {formatDate(p.received_at ?? p.created_at)}
                  </td>
                  <td className="py-2">{METHOD_LABELS[p.provider] ?? p.provider}</td>
                  <td className="py-2 text-gray-700 text-xs">
                    {[p.provider_txn_id, p.note].filter(Boolean).join(' — ') || '—'}
                  </td>
                  <td className="py-2 text-right">{formatPence(p.amount_pence)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="text-sm font-semibold">
                <td colSpan={3} className="pt-3">Total paid</td>
                <td className="pt-3 text-right">{formatPence(booking.amount_paid_pence)}</td>
              </tr>
            </tfoot>
          </table>
          </div>
        )}

        <div className={`flex justify-between font-bold text-sm pt-2 border-t ${booking.balance_pence <= 0 ? 'text-green-600' : 'text-red-600'}`}>
          <span>{booking.balance_pence <= 0 ? 'Fully paid' : 'Balance outstanding'}</span>
          <span>{formatPence(Math.max(0, booking.balance_pence))}</span>
        </div>
      </div>
    </div>
  );
}
