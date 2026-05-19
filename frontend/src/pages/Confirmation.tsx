import { useParams, Link } from 'react-router-dom';
import { useOrder } from '../api/orders';
import { formatPence } from '../utils/currency';

export default function Confirmation() {
  const { id } = useParams<{ id: string }>();
  const { data: order, isLoading } = useOrder(id);

  if (isLoading) return <div className="text-center py-12">Loading…</div>;
  if (!order)
    return <div className="text-center py-12 text-red-500">Order not found.</div>;

  return (
    <div className="max-w-2xl mx-auto text-center">
      <div className="text-6xl mb-4">🎉</div>
      <h1 className="text-3xl font-bold text-gray-900 mb-2">Booking confirmed</h1>
      <p className="text-gray-700 mb-6">
        Order <span className="font-mono font-semibold">{order.order_number}</span>
      </p>

      <div className="bg-white rounded-lg border p-6 text-left mb-6">
        <h2 className="font-semibold text-gray-900 mb-4">Attendees</h2>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-700 border-b">
              <th className="pb-2">Name</th>
              <th className="pb-2 text-right">Price</th>
            </tr>
          </thead>
          <tbody>
            {order.order_items.map((item) => (
              <tr key={item.id} className="border-b">
                <td className="py-2">{item.attendee_name}</td>
                <td className="py-2 text-right">{formatPence(item.price_pence)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td className="pt-3 font-semibold">Total</td>
              <td className="pt-3 font-semibold text-right">{formatPence(order.total_pence)}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      <p className="text-sm text-gray-700 mb-6">
        A confirmation email has been sent to <strong>{order.booker_email}</strong>.
      </p>

      <Link
        to="/"
        className="inline-block bg-sky-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-sky-700"
      >
        Browse more events
      </Link>
    </div>
  );
}
