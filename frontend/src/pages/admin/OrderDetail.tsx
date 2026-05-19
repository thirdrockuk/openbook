import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAdminOrder } from '../../api/admin';
import StatusBadge from '../../components/StatusBadge';
import {
  cancelAdminOrder,
  recordPayment,
  deletePayment,
  updateOrderItemPrice,
  resetOrderItemPrice,
  updateOrderItemRequirements,
} from '../../api/admin';
import { useQueryClient } from '@tanstack/react-query';
import { formatPence } from '../../utils/currency';
import { formatDate } from '../../utils/date';

const METHOD_LABELS: Record<string, string> = {
  cash: 'Cash',
  bank_transfer: 'Bank Transfer',
  cheque: 'Cheque',
  other: 'Other',
  stub: 'Online',
};

export default function AdminOrderDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: order, isLoading } = useAdminOrder(id);
  const qc = useQueryClient();

  const [paymentForm, setPaymentForm] = useState({
    amountGbp: '',
    method: 'cash',
    reference: '',
    note: '',
  });
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const [priceDraftByItemId, setPriceDraftByItemId] = useState<Record<string, string>>({});
  const [priceErrorByItemId, setPriceErrorByItemId] = useState<Record<string, string>>({});
  const [savingPriceItemId, setSavingPriceItemId] = useState<string | null>(null);
  const [reqDraftByItemId, setReqDraftByItemId] = useState<Record<string, { dietary: string; access: string }>>({});
  const [reqErrorByItemId, setReqErrorByItemId] = useState<Record<string, string>>({});
  const [savingReqItemId, setSavingReqItemId] = useState<string | null>(null);

  function handleCopyLink() {
    const url = `${window.location.origin}/booking/${order?.view_token}`;
    navigator.clipboard.writeText(url).then(() => {
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    });
  }

  async function handleCancel() {
    if (!confirm('Cancel this order?')) return;
    try {
      await cancelAdminOrder(id!);
      qc.invalidateQueries({ queryKey: ['admin', 'orders'] });
      qc.invalidateQueries({ queryKey: ['admin', 'events', order?.event_id, 'orders'] });
      qc.invalidateQueries({ queryKey: ['admin', 'dashboard'] });
    } catch {
      alert('Failed to cancel order');
    }
  }

  async function handleRecordPayment(e: React.FormEvent) {
    e.preventDefault();
    setPaymentError(null);
    const pence = Math.round(parseFloat(paymentForm.amountGbp) * 100);
    if (!pence || pence <= 0) { setPaymentError('Enter a valid amount'); return; }
    setSubmitting(true);
    try {
      await recordPayment(id!, {
        amount_pence: pence,
        method: paymentForm.method,
        reference: paymentForm.reference || undefined,
        note: paymentForm.note || undefined,
      });
      setPaymentForm({ amountGbp: '', method: 'cash', reference: '', note: '' });
      qc.invalidateQueries({ queryKey: ['admin', 'orders'] });
      qc.invalidateQueries({ queryKey: ['admin', 'events', order?.event_id, 'orders'] });
    } catch {
      setPaymentError('Failed to record payment');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDeletePayment(paymentId: string) {
    if (!confirm('Remove this payment record?')) return;
    try {
      await deletePayment(id!, paymentId);
      qc.invalidateQueries({ queryKey: ['admin', 'orders'] });
      qc.invalidateQueries({ queryKey: ['admin', 'events', order?.event_id, 'orders'] });
    } catch {
      alert('Failed to remove payment');
    }
  }

  function getPriceDraft(itemId: string, fallbackPence: number): string {
    if (priceDraftByItemId[itemId] != null) {
      return priceDraftByItemId[itemId];
    }
    return (fallbackPence / 100).toFixed(2);
  }

  async function handleUpdateItemPrice(itemId: string, fallbackPence: number) {
    const draft = getPriceDraft(itemId, fallbackPence).trim();
    const parsed = Number.parseFloat(draft);
    if (!Number.isFinite(parsed) || parsed < 0) {
      setPriceErrorByItemId((prev) => ({ ...prev, [itemId]: 'Enter a valid price' }));
      return;
    }

    setSavingPriceItemId(itemId);
    setPriceErrorByItemId((prev) => ({ ...prev, [itemId]: '' }));

    try {
      await updateOrderItemPrice(id!, itemId, Math.round(parsed * 100));
      setPriceDraftByItemId((prev) => {
        const next = { ...prev };
        delete next[itemId];
        return next;
      });
      setPriceErrorByItemId((prev) => ({ ...prev, [itemId]: '' }));
      qc.invalidateQueries({ queryKey: ['admin', 'orders'] });
      qc.invalidateQueries({ queryKey: ['admin', 'events', order?.event_id, 'orders'] });
    } catch (error) {
      const apiError = error as { response?: { data?: { detail?: string } } };
      const detail = apiError.response?.data?.detail;
      setPriceErrorByItemId((prev) => ({
        ...prev,
        [itemId]: detail || 'Failed to update attendee price',
      }));
    } finally {
      setSavingPriceItemId(null);
    }
  }

  function getReqDraft(itemId: string, dietary: string | null, access: string | null) {
    if (reqDraftByItemId[itemId] != null) return reqDraftByItemId[itemId];
    return { dietary: dietary ?? '', access: access ?? '' };
  }

  async function handleUpdateItemRequirements(itemId: string, dietary: string | null, access: string | null) {
    const draft = getReqDraft(itemId, dietary, access);
    setSavingReqItemId(itemId);
    setReqErrorByItemId((prev) => ({ ...prev, [itemId]: '' }));
    try {
      await updateOrderItemRequirements(id!, itemId, {
        dietary_requirements: draft.dietary.trim() || null,
        access_requirements: draft.access.trim() || null,
      });
      setReqDraftByItemId((prev) => {
        const next = { ...prev };
        delete next[itemId];
        return next;
      });
      qc.invalidateQueries({ queryKey: ['admin', 'orders'] });
      qc.invalidateQueries({ queryKey: ['admin', 'events', order?.event_id, 'orders'] });
    } catch {
      setReqErrorByItemId((prev) => ({ ...prev, [itemId]: 'Failed to update requirements' }));
    } finally {
      setSavingReqItemId(null);
    }
  }

  async function handleResetItemPrice(itemId: string) {
    setSavingPriceItemId(itemId);
    setPriceErrorByItemId((prev) => ({ ...prev, [itemId]: '' }));

    try {
      await resetOrderItemPrice(id!, itemId);
      setPriceDraftByItemId((prev) => {
        const next = { ...prev };
        delete next[itemId];
        return next;
      });
      qc.invalidateQueries({ queryKey: ['admin', 'orders'] });
      qc.invalidateQueries({ queryKey: ['admin', 'events', order?.event_id, 'orders'] });
    } catch (error) {
      const apiError = error as { response?: { data?: { detail?: string } } };
      const detail = apiError.response?.data?.detail;
      setPriceErrorByItemId((prev) => ({
        ...prev,
        [itemId]: detail || 'Failed to reset attendee price',
      }));
    } finally {
      setSavingPriceItemId(null);
    }
  }

  if (isLoading) return <div role="status" className="text-gray-500">Loading…</div>;
  if (!order) return <div className="text-red-500">Order not found.</div>;

  const canEditAttendeePrices = order.status === 'pending' || order.status === 'confirmed';
  const canEditRequirements = order.status === 'pending' || order.status === 'confirmed';

  return (
    <div>
      <button
        type="button"
        onClick={() => navigate(-1)}
        className="text-sm text-sky-600 hover:underline mb-4 block"
      >
        ← Back to orders
      </button>
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{order.order_number}</h1>
          <p className="text-sm text-gray-500 mt-1">
            {new Date(order.created_at).toLocaleString('en-GB')}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-gray-50 border rounded px-3 py-1">
            <a
              href={`/booking/${order.view_token}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-sky-600 hover:underline font-mono"
            >
              {`${window.location.origin}/booking/${order.view_token}`}
            </a>
            <button
              type="button"
              onClick={handleCopyLink}
              className="text-xs text-gray-500 hover:text-gray-800 ml-1 shrink-0"
              title="Copy link"
            >
              {linkCopied ? '✓' : '⎘'}
            </button>
          </div>
          <StatusBadge status={order.status} />
        </div>
      </div>

      <div className="bg-white border rounded-lg p-6 mb-4">
        <h2 className="font-semibold text-gray-800 mb-3">Booker Details</h2>
        <dl className="space-y-1 text-sm">
          <div className="flex gap-4">
            <dt className="text-gray-500 w-24">Name</dt>
            <dd className="text-gray-800">{order.booker_name}</dd>
          </div>
          <div className="flex gap-4">
            <dt className="text-gray-500 w-24">Email</dt>
            <dd className="text-gray-800">{order.booker_email}</dd>
          </div>
          {order.booker_phone && (
            <div className="flex gap-4">
              <dt className="text-gray-500 w-24">Phone</dt>
              <dd className="text-gray-800">{order.booker_phone}</dd>
            </div>
          )}
        </dl>
      </div>

      <div className="bg-white border rounded-lg p-6 mb-6">
        <h2 className="font-semibold text-gray-800 mb-3">Attendees</h2>
        <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-500 border-b text-xs uppercase">
              <th className="pb-2 pr-3">Name</th>
              <th className="pb-2 pr-3">Ticket type</th>
              <th className="pb-2 pr-3">DOB</th>
              <th className="pb-2 pr-3">Band</th>
              <th className="pb-2 pr-3 text-right">Venue Fee</th>
              <th className="pb-2 pr-3 text-right">Price</th>
              <th className="pb-2 text-right">Set Price (£)</th>
            </tr>
          </thead>
          <tbody>
            {order.order_items.map((item) => (
              <React.Fragment key={item.id}>
              <tr className="border-b border-gray-100">
                <td className="pt-4 pb-2 pr-3 font-medium">{item.attendee_name}</td>
                <td className="pt-4 pb-2 pr-3 text-gray-500">{item.ticket_type_name ?? '—'}</td>
                <td className="pt-4 pb-2 pr-3 text-gray-500">{formatDate(item.attendee_dob)}</td>
                <td className="pt-4 pb-2 pr-3 text-gray-500">
                  {item.price_band_label ?? '—'}
                  {item.price_band_qualifier && (
                    <span className="ml-1 px-1.5 py-0.5 bg-sky-100 text-sky-700 rounded text-xs">
                      {item.price_band_qualifier}
                    </span>
                  )}
                </td>
                <td className="pt-4 pb-2 pr-3 text-right text-gray-500">{formatPence(item.venue_fee_pence)}</td>
                <td className="pt-4 pb-2 pr-3 text-right">{formatPence(item.price_pence)}</td>
                <td className="pt-4 pb-2 text-right">
                  {canEditAttendeePrices ? (
                    <div className="flex flex-col items-end gap-1">
                      <div className="flex items-center justify-end gap-2">
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={getPriceDraft(item.id, item.price_pence)}
                          onChange={(e) => {
                            const value = e.target.value;
                            setPriceDraftByItemId((prev) => ({ ...prev, [item.id]: value }));
                            setPriceErrorByItemId((prev) => ({ ...prev, [item.id]: '' }));
                          }}
                          className="w-24 border rounded px-2 py-1 text-xs text-right"
                        />
                        <button
                          type="button"
                          onClick={() => handleUpdateItemPrice(item.id, item.price_pence)}
                          disabled={savingPriceItemId === item.id}
                          className="text-xs px-2 py-1 rounded border border-gray-300 hover:bg-gray-50 disabled:opacity-50"
                        >
                          {savingPriceItemId === item.id ? 'Saving…' : 'Save'}
                        </button>
                        {item.standard_price_pence != null && item.price_pence !== item.standard_price_pence && (
                          <button
                            type="button"
                            onClick={() => handleResetItemPrice(item.id)}
                            disabled={savingPriceItemId === item.id}
                            className="text-xs px-2 py-1 rounded border border-sky-300 text-sky-700 hover:bg-sky-50 disabled:opacity-50"
                          >
                            Reset
                          </button>
                        )}
                      </div>
                      {item.standard_price_pence != null && (
                        <p className="text-xs text-gray-500">Std: {formatPence(item.standard_price_pence)}</p>
                      )}
                    </div>
                  ) : (
                    <span className="text-xs text-gray-400">Locked</span>
                  )}
                  {priceErrorByItemId[item.id] && (
                    <p className="text-xs text-red-600 mt-1">{priceErrorByItemId[item.id]}</p>
                  )}
                </td>
              </tr>
              <tr key={`${item.id}-req`} className="border-b border-gray-200 bg-gray-50">
                <td colSpan={6} className="pb-4 px-0">
                  <div className="flex flex-wrap gap-3 items-end">
                    <div className="flex-1 min-w-[180px]">
                      <label htmlFor={`dietary-${item.id}`} className="block text-xs text-gray-500 mb-0.5">Dietary requirements</label>
                      {canEditRequirements ? (
                        <textarea
                          id={`dietary-${item.id}`}
                          rows={1}
                          className="w-full border rounded px-2 py-1 text-xs resize-none"
                          value={getReqDraft(item.id, item.dietary_requirements, item.access_requirements).dietary}
                          onChange={(e) =>
                            setReqDraftByItemId((prev) => ({
                              ...prev,
                              [item.id]: {
                                ...getReqDraft(item.id, item.dietary_requirements, item.access_requirements),
                                dietary: e.target.value,
                              },
                            }))
                          }
                          placeholder="None"
                        />
                      ) : (
                        <p className="text-xs text-gray-600">{item.dietary_requirements || '—'}</p>
                      )}
                    </div>
                    <div className="flex-1 min-w-[180px]">
                      <label htmlFor={`access-${item.id}`} className="block text-xs text-gray-500 mb-0.5">Access requirements</label>
                      {canEditRequirements ? (
                        <textarea
                          id={`access-${item.id}`}
                          rows={1}
                          className="w-full border rounded px-2 py-1 text-xs resize-none"
                          value={getReqDraft(item.id, item.dietary_requirements, item.access_requirements).access}
                          onChange={(e) =>
                            setReqDraftByItemId((prev) => ({
                              ...prev,
                              [item.id]: {
                                ...getReqDraft(item.id, item.dietary_requirements, item.access_requirements),
                                access: e.target.value,
                              },
                            }))
                          }
                          placeholder="None"
                        />
                      ) : (
                        <p className="text-xs text-gray-600">{item.access_requirements || '—'}</p>
                      )}
                    </div>
                    {canEditRequirements && (
                      <div className="flex flex-col gap-1">
                        <button
                          type="button"
                          onClick={() => handleUpdateItemRequirements(item.id, item.dietary_requirements, item.access_requirements)}
                          disabled={savingReqItemId === item.id}
                          className="text-xs px-2 py-1 rounded border border-gray-300 hover:bg-white disabled:opacity-50"
                        >
                          {savingReqItemId === item.id ? 'Saving…' : 'Save'}
                        </button>
                        {reqErrorByItemId[item.id] && (
                          <p className="text-xs text-red-600">{reqErrorByItemId[item.id]}</p>
                        )}
                      </div>
                    )}
                  </div>
                </td>
              </tr>
              </React.Fragment>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={4} className="pt-3 font-semibold">Total</td>
              <td className="pt-3 font-semibold text-right">{formatPence(order.total_pence)}</td>
              <td />
            </tr>
          </tfoot>
        </table>
        {!canEditAttendeePrices && (
          <p className="text-xs text-gray-500 mt-3">
            Attendee prices can only be edited while an order is pending or confirmed.
          </p>
        )}
        </div>
      </div>

      {/* Payments */}
      <div className="bg-white border rounded-lg p-6 mb-4">
        <h2 className="font-semibold text-gray-800 mb-3">Payments</h2>

        {order.payments.length === 0 ? (
          <p className="text-sm text-gray-400 mb-4">No payments recorded yet.</p>
        ) : (
          <div className="overflow-x-auto">
          <table className="w-full text-sm mb-4">
            <thead>
              <tr className="text-left text-gray-500 border-b text-xs uppercase">
                <th className="pb-2">Date</th>
                <th className="pb-2">Method</th>
                <th className="pb-2">Reference / Note</th>
                <th className="pb-2 text-right">Amount</th>
                <th className="pb-2" />
              </tr>
            </thead>
            <tbody>
              {order.payments.map((p) => (
                <tr key={p.id} className="border-b">
                  <td className="py-2 text-gray-500 whitespace-nowrap">
                    {formatDate(p.received_at ?? p.created_at)}
                  </td>
                  <td className="py-2">{METHOD_LABELS[p.provider] ?? p.provider}</td>
                  <td className="py-2 text-gray-500 text-xs">
                    {[p.provider_txn_id, p.note].filter(Boolean).join(' — ') || '—'}
                  </td>
                  <td className="py-2 text-right">{formatPence(p.amount_pence)}</td>
                  <td className="py-2 text-right">
                    {p.provider !== 'stub' && (
                      <button
                        type="button"
                        onClick={() => handleDeletePayment(p.id)}
                        className="text-red-400 hover:text-red-600 text-xs"
                      >
                        Remove
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="text-sm font-semibold">
                <td colSpan={3} className="pt-3">Total paid</td>
                <td className="pt-3 text-right">{formatPence(order.amount_paid_pence)}</td>
                <td />
              </tr>
              <tr className={`text-sm font-bold ${order.balance_pence <= 0 ? 'text-green-600' : 'text-red-600'}`}>
                <td colSpan={3} className="pt-1">Balance remaining</td>
                <td className="pt-1 text-right">{formatPence(Math.max(0, order.balance_pence))}</td>
                <td />
              </tr>
            </tfoot>
          </table>
          </div>
        )}

        {/* Summary when no payment rows yet */}
        {order.payments.length === 0 && (
          <div className="flex justify-between text-sm font-semibold text-red-600 mb-4">
            <span>Balance remaining</span>
            <span>{formatPence(order.total_pence)}</span>
          </div>
        )}

        {/* Add payment form */}
        {order.status !== 'cancelled' && order.status !== 'refunded' && (
          <form onSubmit={handleRecordPayment} className="border-t pt-4 space-y-3">
            <h3 className="text-sm font-medium text-gray-700">Record a payment</h3>
            {paymentError && (
              <p role="alert" className="text-xs text-red-600">{paymentError}</p>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="payment-amount" className="block text-xs text-gray-500 mb-1">Amount (£)</label>
                <input
                  id="payment-amount"
                  type="number"
                  step="0.01"
                  min="0.01"
                  className="w-full border rounded px-3 py-1.5 text-sm"
                  placeholder="0.00"
                  value={paymentForm.amountGbp}
                  onChange={(e) => setPaymentForm({ ...paymentForm, amountGbp: e.target.value })}
                  required
                />
              </div>
              <div>
                <label htmlFor="payment-method" className="block text-xs text-gray-500 mb-1">Method</label>
                <select
                  id="payment-method"
                  className="w-full border rounded px-3 py-1.5 text-sm"
                  value={paymentForm.method}
                  onChange={(e) => setPaymentForm({ ...paymentForm, method: e.target.value })}
                >
                  <option value="cash">Cash</option>
                  <option value="bank_transfer">Bank Transfer</option>
                  <option value="cheque">Cheque</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="payment-reference" className="block text-xs text-gray-500 mb-1">Reference (optional)</label>
                <input
                  id="payment-reference"
                  type="text"
                  className="w-full border rounded px-3 py-1.5 text-sm"
                  placeholder="Cheque no., transfer ref…"
                  value={paymentForm.reference}
                  onChange={(e) => setPaymentForm({ ...paymentForm, reference: e.target.value })}
                />
              </div>
              <div>
                <label htmlFor="payment-note" className="block text-xs text-gray-500 mb-1">Note (optional)</label>
                <input
                  id="payment-note"
                  type="text"
                  className="w-full border rounded px-3 py-1.5 text-sm"
                  placeholder="Any additional note"
                  value={paymentForm.note}
                  onChange={(e) => setPaymentForm({ ...paymentForm, note: e.target.value })}
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={submitting}
              className="bg-sky-600 text-white px-5 py-1.5 rounded text-sm font-medium hover:bg-sky-700 disabled:opacity-50"
            >
              {submitting ? 'Saving…' : 'Record Payment'}
            </button>
          </form>
        )}
      </div>

      {order.status === 'pending' || order.status === 'confirmed' ? (
        <button
          type="button"
          onClick={handleCancel}
          className="bg-red-600 text-white px-6 py-2 rounded font-medium hover:bg-red-700"
        >
          Cancel Order
        </button>
      ) : null}
    </div>
  );
}
