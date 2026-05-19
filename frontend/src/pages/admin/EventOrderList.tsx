import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { cancelAdminOrder, useAdminEvent, useAdminOrdersPage } from '../../api/admin';
import type { OrderSortCol } from '../../api/admin';
import { useQueryClient } from '@tanstack/react-query';
import { formatPence } from '../../utils/currency';
import StatusBadge from '../../components/StatusBadge';
import { formatDate } from '../../utils/date';

function SortIndicator({ col, sortCol, sortDir }: { col: OrderSortCol; sortCol: OrderSortCol; sortDir: 'asc' | 'desc' }) {
  if (col !== sortCol) return <span className="opacity-30" aria-hidden="true"> ⇅</span>;
  return <span aria-hidden="true">{sortDir === 'desc' ? ' ↓' : ' ↑'}</span>;
}

export default function AdminEventOrderList() {
  const { id: eventId } = useParams<{ id: string }>();
  const { data: event, isLoading: isEventLoading } = useAdminEvent(eventId);
  const qc = useQueryClient();
  const [actionError, setActionError] = useState<string | null>(null);
  const [cancellingOrderId, setCancellingOrderId] = useState<string | null>(null);
  const [sortCol, setSortCol] = useState<OrderSortCol>('created_at');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<10 | 20 | 50>(10);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [includeCancelled, setIncludeCancelled] = useState(false);

  const { data: ordersPage, isLoading: isOrdersLoading, isFetching } = useAdminOrdersPage(
    eventId!, page, pageSize, sortDir, sortCol, search, includeCancelled
  );

  function handleSort(col: OrderSortCol) {
    if (col === sortCol) {
      setSortDir((prev) => (prev === 'desc' ? 'asc' : 'desc'));
    } else {
      setSortCol(col);
      setSortDir('asc');
    }
    setPage(1);
  }

  function submitSearch(e?: React.FormEvent) {
    e?.preventDefault();
    setSearch(searchInput.trim());
    setPage(1);
  }

  async function handleCancel(orderId: string) {
    if (!confirm('Cancel this booking?')) return;
    setActionError(null);
    setCancellingOrderId(orderId);
    try {
      await cancelAdminOrder(orderId);
      qc.invalidateQueries({ queryKey: ['admin', 'events', eventId, 'orders'] });
      qc.invalidateQueries({ queryKey: ['admin', 'dashboard'] });
    } catch (error) {
      const apiError = error as { response?: { data?: { detail?: string } } };
      const detail = apiError.response?.data?.detail;
      setActionError(detail || 'Failed to cancel booking');
    } finally {
      setCancellingOrderId(null);
    }
  }

  if (isEventLoading || isOrdersLoading) return <div className="text-gray-500">Loading…</div>;

  const orders = ordersPage?.items ?? [];
  const total = ordersPage?.total ?? 0;
  const totalPages = ordersPage?.total_pages ?? 0;
  const fromRow = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const toRow = total === 0 ? 0 : (page - 1) * pageSize + orders.length;

  return (
    <div>
      <Link to={`/admin/events/${eventId}`} className="text-sm text-sky-600 hover:underline">
        ← Back to event
      </Link>
      <h1 className="text-2xl font-bold text-gray-900 mt-1 mb-1">{event?.title}</h1>
      <div className="flex items-center justify-between mb-6 gap-4">
        <p className="text-sm text-gray-500">Orders</p>
        <div className="flex items-center gap-3">
          <form onSubmit={submitSearch} className="flex items-center gap-1">
            <input
              type="search"
              placeholder="Search by name…"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="border rounded px-3 py-1 text-sm w-52"
            />
            <button type="submit" className="px-3 py-1 border rounded text-sm bg-white hover:bg-gray-50 text-gray-700">
              Search
            </button>
            {search && (
              <button
                type="button"
                onClick={() => { setSearchInput(''); setSearch(''); setPage(1); }}
                className="px-3 py-1 border rounded text-sm bg-white hover:bg-gray-50 text-gray-500"
              >
                Clear
              </button>
            )}
          </form>
          <label className="text-sm text-gray-600 flex items-center gap-2 select-none cursor-pointer">
            <input
              type="checkbox"
              checked={includeCancelled}
              onChange={(e) => { setIncludeCancelled(e.target.checked); setPage(1); }}
              className="rounded"
            />
            Include cancelled
          </label>
          <label className="text-sm text-gray-600 flex items-center gap-2">
            Per page
            <select
              value={pageSize}
              onChange={(e) => { setPageSize(Number(e.target.value) as 10 | 20 | 50); setPage(1); }}
              className="border rounded px-2 py-1 text-sm"
            >
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
            </select>
          </label>
        </div>
      </div>

      {actionError && <p className="text-sm text-red-600 mb-3">{actionError}</p>}

      {!orders.length ? (
        <p className="text-gray-500">{search ? 'No orders match your search.' : 'No orders yet.'}</p>
      ) : (
        <div className="bg-white rounded-lg border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
              <tr>
                <th className="px-4 py-3 text-left">
                  <button type="button" onClick={() => handleSort('created_at')} className="inline-flex items-center hover:text-gray-700">
                    Date<SortIndicator col="created_at" sortCol={sortCol} sortDir={sortDir} />
                  </button>
                </th>
                <th className="px-4 py-3 text-left">
                  <button type="button" onClick={() => handleSort('order_number')} className="inline-flex items-center hover:text-gray-700">
                    Order #<SortIndicator col="order_number" sortCol={sortCol} sortDir={sortDir} />
                  </button>
                </th>
                <th className="px-4 py-3 text-left">
                  <button type="button" onClick={() => handleSort('booker_name')} className="inline-flex items-center hover:text-gray-700">
                    Booker<SortIndicator col="booker_name" sortCol={sortCol} sortDir={sortDir} />
                  </button>
                </th>
                <th className="px-4 py-3 text-left">
                  <button type="button" onClick={() => handleSort('status')} className="inline-flex items-center hover:text-gray-700">
                    Status<SortIndicator col="status" sortCol={sortCol} sortDir={sortDir} />
                  </button>
                </th>
                <th className="px-4 py-3 text-right">
                  <button type="button" onClick={() => handleSort('total_pence')} className="inline-flex items-center justify-end w-full hover:text-gray-700">
                    Total<SortIndicator col="total_pence" sortCol={sortCol} sortDir={sortDir} />
                  </button>
                </th>
                <th className="px-4 py-3 text-right">Paid</th>
                <th className="px-4 py-3 text-right">Outstanding</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y">
              {orders.map((order) => (
                <tr key={order.id}>
                  <td className="px-4 py-3 text-gray-500">{formatDate(order.created_at)}</td>
                  <td className="px-4 py-3 font-mono text-xs">{order.order_number}</td>
                  <td className="px-4 py-3">
                    <div>{order.booker_name}</div>
                    <div className="text-xs text-gray-500">{order.booker_email}</div>
                  </td>
                  <td className="px-4 py-3"><StatusBadge status={order.status} /></td>
                  <td className="px-4 py-3 text-right">{formatPence(order.total_pence)}</td>
                  <td className="px-4 py-3 text-right">{formatPence(order.amount_paid_pence)}</td>
                  <td className={`px-4 py-3 text-right font-medium ${order.balance_pence > 0 ? 'text-red-600' : 'text-green-600'}`}>
                    {formatPence(Math.max(0, order.balance_pence))}
                  </td>
                  <td className="px-4 py-3 text-right whitespace-nowrap flex gap-2 justify-end">
                    <Link
                      to={`/admin/orders/${order.id}`}
                      className="inline-block bg-sky-600 text-white px-3 py-1.5 rounded text-xs font-medium hover:bg-sky-700 focus:outline-none focus:ring-2 focus:ring-sky-500"
                    >
                      View
                    </Link>
                    {(order.status === 'pending' || order.status === 'confirmed') && (
                      <button
                        onClick={() => handleCancel(order.id)}
                        disabled={cancellingOrderId === order.id}
                        className="inline-block bg-red-600 text-white px-3 py-1.5 rounded text-xs font-medium hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 disabled:opacity-50"
                      >
                        {cancellingOrderId === order.id ? 'Cancelling…' : 'Cancel'}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="flex items-center justify-between px-4 py-3 border-t bg-gray-50 text-sm">
            <p className="text-gray-600">Showing {fromRow}–{toRow} of {total}</p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1 || isFetching}
                className="px-3 py-1 border rounded text-gray-700 hover:bg-gray-100 disabled:opacity-50"
              >
                Previous
              </button>
              <span className="text-gray-700">Page {totalPages === 0 ? 1 : page} of {Math.max(totalPages, 1)}</span>
              <button
                type="button"
                onClick={() => setPage((p) => p + 1)}
                disabled={isFetching || totalPages === 0 || page >= totalPages}
                className="px-3 py-1 border rounded text-gray-700 hover:bg-gray-100 disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
