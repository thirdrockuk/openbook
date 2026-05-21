import { useState, useEffect, type FormEvent } from 'react';
import { useParams, Link, useLocation } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { useOrder, confirmOrder, createPaymentIntent } from '../api/orders';
import { formatPence } from '../utils/currency';

const stripePromise = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY
  ? loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY as string)
  : null;

// Must be rendered inside <Elements>
function CardPaymentForm({ orderId, totalPence, onSuccess }: {
  orderId: string;
  totalPence: number;
  onSuccess: () => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);

  async function handlePay(e: FormEvent) {
    e.preventDefault();
    if (!stripe || !elements) return;
    setProcessing(true);
    setError(null);

    const result = await stripe.confirmPayment({
      elements,
      confirmParams: { return_url: window.location.href },
      redirect: 'if_required',
    });

    if (result.error) {
      setError(result.error.message ?? 'Payment failed. Please try again.');
      setProcessing(false);
      return;
    }

    if (result.paymentIntent?.status === 'succeeded') {
      try {
        await confirmOrder(orderId, result.paymentIntent.id);
        onSuccess();
      } catch {
        setError('Payment was taken but we could not confirm your order. Please contact us quoting your order number.');
        setProcessing(false);
      }
    }
  }

  return (
    <form onSubmit={handlePay}>
      <PaymentElement />
      {error && <p role="alert" className="text-sm text-red-600 mt-3">{error}</p>}
      <button
        type="submit"
        disabled={!stripe || processing}
        className="mt-4 w-full bg-sky-600 text-white px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-sky-700 transition-colors disabled:opacity-50"
      >
        {processing ? 'Processing…' : `Pay ${formatPence(totalPence)}`}
      </button>
    </form>
  );
}

// Attendees + booker summary, shared between card payment and confirmed states
function OrderSummarySection({ order }: { order: ReturnType<typeof useOrder>['data'] }) {
  if (!order) return null;
  return (
    <>
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 mb-4">
        <h2 className="font-semibold text-gray-900 mb-4">Attendees</h2>
        <div className="divide-y divide-gray-100">
          {order.order_items.map((item) => (
            <div key={item.id} className="flex items-start justify-between py-3 first:pt-0 last:pb-0">
              <div>
                <p className="text-sm font-medium text-gray-900">{item.attendee_name}</p>
                {item.ticket_type_name && (
                  <p className="text-xs text-gray-500 mt-0.5">
                    {item.ticket_type_name}{item.price_band_label ? ` — ${item.price_band_label}` : ''}
                  </p>
                )}
              </div>
              <span className="text-sm font-medium text-gray-900 whitespace-nowrap ml-4">{formatPence(item.price_pence)}</span>
            </div>
          ))}
        </div>
        <div className="border-t border-gray-200 mt-3 pt-3 flex justify-between">
          <span className="text-sm font-semibold text-gray-900">Total</span>
          <span className="text-sm font-semibold text-gray-900">{formatPence(order.total_pence)}</span>
        </div>
      </div>
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 mb-8">
        <h2 className="font-semibold text-gray-900 mb-3">Booking made by</h2>
        <p className="text-sm text-gray-700">{order.booker_name}</p>
        <p className="text-sm text-gray-700">{order.booker_email}</p>
        {order.booker_phone && <p className="text-sm text-gray-700">{order.booker_phone}</p>}
      </div>
    </>
  );
}

export default function Confirmation() {
  const { id } = useParams<{ id: string }>();
  const { data: order, isLoading } = useOrder(id);
  const { state } = useLocation();
  const paymentMethod: 'bank_transfer' | 'card' | null = state?.paymentMethod ?? null;
  const qc = useQueryClient();

  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [piLoading, setPiLoading] = useState(false);
  const [piError, setPiError] = useState<string | null>(null);
  const [paid, setPaid] = useState(false);

  const needsCardPayment =
    order?.payment_method === 'card' && order?.status === 'pending' && !paid;

  // Handle return from 3DS redirect (Stripe adds ?payment_intent=...&redirect_status=succeeded)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('redirect_status') !== 'succeeded') return;
    if (!order || order.payment_method !== 'card' || order.status !== 'pending') return;

    confirmOrder(order.id)
      .then(() => {
        setPaid(true);
        qc.invalidateQueries({ queryKey: ['orders', order.id] });
        window.history.replaceState({}, '', window.location.pathname);
      })
      .catch(() => {
        // May already be confirmed; refresh to get latest state
        qc.invalidateQueries({ queryKey: ['orders', order.id] });
        window.history.replaceState({}, '', window.location.pathname);
      });
  }, [order?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Fetch Payment Intent when a card order is pending
  useEffect(() => {
    if (!needsCardPayment || !order) return;
    setPiLoading(true);
    createPaymentIntent(order.id)
      .then(({ client_secret }) => setClientSecret(client_secret))
      .catch(() => setPiError('Could not initialise payment. Please refresh and try again.'))
      .finally(() => setPiLoading(false));
  }, [order?.id, needsCardPayment]); // eslint-disable-line react-hooks/exhaustive-deps

  if (isLoading) return <div role="status" className="text-center py-12 text-gray-500">Loading…</div>;
  if (!order) return <div className="text-center py-12 text-red-500">Order not found.</div>;

  // ── Card payment pending ─────────────────────────────────────────────────
  if (needsCardPayment) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-sky-100">
            <svg className="h-5 w-5 text-sky-600" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" />
            </svg>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Complete your payment</h1>
            <p className="text-sm text-gray-500">Order {order.order_number} · {formatPence(order.total_pence)}</p>
          </div>
        </div>

        <div className="bg-white border border-gray-100 rounded-xl shadow-sm p-6 mb-6">
          {piLoading && <p className="text-sm text-gray-500">Setting up payment form…</p>}
          {piError && <p className="text-sm text-red-600">{piError}</p>}
          {clientSecret && stripePromise && (
            <Elements
              stripe={stripePromise}
              options={{
                clientSecret,
                appearance: {
                  theme: 'stripe',
                  variables: { colorPrimary: '#0284c7', borderRadius: '8px' },
                },
              }}
            >
              <CardPaymentForm
                orderId={order.id}
                totalPence={order.total_pence}
                onSuccess={() => {
                  setPaid(true);
                  qc.invalidateQueries({ queryKey: ['orders', order.id] });
                }}
              />
            </Elements>
          )}
        </div>

        <OrderSummarySection order={order} />
      </div>
    );
  }

  // ── Confirmed ────────────────────────────────────────────────────────────
  const effectiveMethod = order.payment_method ?? paymentMethod;

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-green-100">
          <svg className="h-5 w-5 text-green-600" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
          </svg>
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Booking confirmed</h1>
          <p className="text-sm text-gray-500">Order {order.order_number}</p>
        </div>
      </div>

      <div className="bg-sky-50 border border-sky-100 rounded-xl px-5 py-3 text-sm text-sky-800 mb-6">
        A confirmation email has been sent to <strong>{order.booker_email}</strong>.
      </div>

      {effectiveMethod === 'bank_transfer' && order.balance_pence > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 mb-6">
          <h2 className="font-semibold text-amber-900 mb-1">Payment due: {formatPence(order.balance_pence)}</h2>
          <p className="text-sm text-amber-800 mb-3">
            Please pay by bank transfer using the details below, quoting your order number <strong>{order.order_number}</strong>.
          </p>
          <pre className="text-sm text-amber-900 whitespace-pre-wrap font-sans">
            {'Bank transfer details will be included in your confirmation email.'}
          </pre>
        </div>
      )}

      <OrderSummarySection order={order} />

      <Link
        to="/"
        className="inline-flex items-center bg-sky-600 text-white px-6 py-3 rounded-lg text-sm font-medium hover:bg-sky-700 transition-colors"
      >
        Browse more events
      </Link>
    </div>
  );
}
