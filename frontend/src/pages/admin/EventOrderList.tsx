import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { cancelAdminOrder, useAdminEvent, useAdminOrdersPage } from '../../api/admin';
import type { OrderSortCol } from '../../api/admin';
import { useQueryClient } from '@tanstack/react-query';
import { formatPence } from '../../utils/currency';
import StatusBadge from '../../components/StatusBadge';
import { formatDate } from '../../utils/date';

function SortIndicator({ col, sortCol, sortDir }: { col: OrderSortCol; sortCol: OrderSortCol; sortDir: 'asc' | 'desc' }) {
  if (col !== sortCol) {
    return (
      <svg className="h-3.5 w-3.5 text-gray-300 ml-1" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 15L12 18.75 15.75 15m-7.5-6L12 5.25 15.75 9" />
      </svg>
    );
  }
  return sortDir === 'desc' ? (
    <svg className="h-3.5 w-3.5 text-sky-500 ml-1" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
    </svg>
  ) : (
    <svg className="h-3.5 w-3.5 text-sky-500 ml-1" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 15.75l7.5-7.5 7.5 7.5" />
    </svg>
  );
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

  if (isEventLoading || isOrdersLoading) return <div role="status" className="text-gray-500">Loading…</div>;

  const orders = ordersPage?.items ?? [];
  const total = ordersPage?.total ?? 0;
  const totalPages = ordersPage?.total_pages ?? 0;
  const fromRow = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const toRow = total === 0 ? 0 : (page - 1) * pageSize + orders.length;

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
        <div className="flex items-center gap-2 mt-1">
          <p className="text-sm text-gray-500">
            {search ? `Results matching "${search}"` : 'Orders'}
          </p>
          <span className="text-xs font-medium bg-sky-100 text-sky-700 px-1.5 py-0.5 rounded-full">{total}</span>
          {isFetching && <span className="text-sm text-gray-400">Updating…</span>}
        </div>
      </div>

      {/* Controls */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm px-4 py-3 mb-4 flex flex-wrap items-center gap-3">
        <form onSubmit={submitSearch} className="flex items-center gap-2 flex-1 min-w-0">
          <div className="relative flex-1 max-w-xs">
            <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400 pointer-events-none" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
            </svg>
            <input
              type="search"
              placeholder="Search by name…"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="w-full border border-gray-200 rounded-lg pl-8 pr-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent"
            />
          </div>
          <button type="submit" className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm bg-white hover:bg-gray-50 text-gray-700 transition-colors">
            Search
          </button>
          {search && (
            <button
              type="button"
              onClick={() => { setSearchInput(''); setSearch(''); setPage(1); }}
              className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm bg-white hover:bg-gray-50 text-gray-500 transition-colors"
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
            className="border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
          >
            <option value={10}>10</option>
            <option value={20}>20</option>
            <option value={50}>50</option>
          </select>
        </label>
      </div>

      {actionError && <p role="alert" className="text-sm text-red-600 mb-3">{actionError}</p>}

      {!orders.length ? (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-12 text-center">
          <div className="mx-auto h-12 w-12 rounded-full bg-gray-100 flex items-center justify-center mb-4">
            <svg className="h-6 w-6 text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25z" />
            </svg>
          </div>
          <p className="text-gray-900 font-semibold mb-1">
            {search ? 'No orders match your search' : 'No orders yet'}
          </p>
          {search && (
            <button
              type="button"
              onClick={() => { setSearchInput(''); setSearch(''); setPage(1); }}
              className="text-sm text-sky-600 hover:underline mt-1"
            >
              Clear search
            </button>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide" aria-sort={sortCol === 'created_at' ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'}>
                  <button type="button" onClick={() => handleSort('created_at')} className="inline-flex items-center hover:text-gray-800 transition-colors">
                    Date<SortIndicator col="created_at" sortCol={sortCol} sortDir={sortDir} />
                  </button>
                </th>
                <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide" aria-sort={sortCol === 'order_number' ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'}>
                  <button type="button" onClick={() => handleSort('order_number')} className="inline-flex items-center hover:text-gray-800 transition-colors">
                    Order #<SortIndicator col="order_number" sortCol={sortCol} sortDir={sortDir} />
                  </button>
                </th>
                <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide" aria-sort={sortCol === 'booker_name' ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'}>
                  <button type="button" onClick={() => handleSort('booker_name')} className="inline-flex items-center hover:text-gray-800 transition-colors">
                    Booker<SortIndicator col="booker_name" sortCol={sortCol} sortDir={sortDir} />
                  </button>
                </th>
                <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide" aria-sort={sortCol === 'status' ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'}>
                  <button type="button" onClick={() => handleSort('status')} className="inline-flex items-center hover:text-gray-800 transition-colors">
                    Status<SortIndicator col="status" sortCol={sortCol} sortDir={sortDir} />
                  </button>
                </th>
                <th className="px-5 py-3.5 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide" aria-sort={sortCol === 'total_pence' ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'}>
                  <button type="button" onClick={() => handleSort('total_pence')} className="inline-flex items-center justify-end w-full hover:text-gray-800 transition-colors">
                    Total<SortIndicator col="total_pence" sortCol={sortCol} sortDir={sortDir} />
                  </button>
                </th>
                <th className="px-5 py-3.5 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">Paid</th>
                <th className="px-5 py-3.5 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">Outstanding</th>
                <th className="px-5 py-3.5" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {orders.map((order) => (
                <tr key={order.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-4 text-gray-500">{formatDate(order.created_at)}</td>
                  <td className="px-5 py-4 font-mono text-xs text-gray-700">{order.order_number}</td>
                  <td className="px-5 py-4">
                    <div className="font-medium text-gray-900">{order.booker_name}</div>
                    <div className="text-xs text-gray-500">{order.booker_email}</div>
                  </td>
                  <td className="px-5 py-4"><StatusBadge status={order.status} /></td>
                  <td className="px-5 py-4 text-right">{formatPence(order.total_pence)}</td>
                  <td className="px-5 py-4 text-right text-gray-500">{formatPence(order.amount_paid_pence)}</td>
                  <td className={`px-5 py-4 text-right font-medium ${order.balance_pence > 0 ? 'text-red-600' : 'text-green-600'}`}>
                    {formatPence(Math.max(0, order.balance_pence))}
                  </td>
                  <td className="px-5 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Link
                        to={`/admin/orders/${order.id}`}
                        className="inline-flex items-center gap-1 bg-sky-600 text-white px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-sky-700 transition-colors focus:outline-none focus:ring-2 focus:ring-sky-500"
                      >
                        View
                        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                        </svg>
                      </Link>
                      {(order.status === 'pending' || order.status === 'confirmed') && (
                        <button
                          type="button"
                          onClick={() => handleCancel(order.id)}
                          disabled={cancellingOrderId === order.id}
                          className="inline-flex items-center border border-red-200 text-red-600 bg-white px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-red-50 transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 disabled:opacity-50"
                        >
                          {cancellingOrderId === order.id ? 'Cancelling…' : 'Cancel'}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100 text-sm">
            <p className="text-gray-500">Showing {fromRow}–{toRow} of {total}</p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1 || isFetching}
                className="flex items-center gap-1 px-3 py-1.5 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 disabled:opacity-40 transition-colors text-xs font-medium"
              >
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
                </svg>
                Previous
              </button>
              <span className="text-gray-600 px-1">Page {totalPages === 0 ? 1 : page} of {Math.max(totalPages, 1)}</span>
              <button
                type="button"
                onClick={() => setPage((p) => p + 1)}
                disabled={isFetching || totalPages === 0 || page >= totalPages}
                className="flex items-center gap-1 px-3 py-1.5 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 disabled:opacity-40 transition-colors text-xs font-medium"
              >
                Next
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
