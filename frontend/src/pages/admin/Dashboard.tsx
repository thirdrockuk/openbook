import { useDashboard } from '../../api/admin';
import { formatPence } from '../../utils/currency';

export default function AdminDashboard() {
  const { data, isLoading } = useDashboard();

  if (isLoading) return <div className="text-gray-500">Loading…</div>;

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Dashboard</h1>
      <div className="grid grid-cols-2 gap-6 md:grid-cols-4">
        <StatCard label="Total Events" value={String(data?.total_events ?? 0)} />
        <StatCard label="Total Orders" value={String(data?.total_orders ?? 0)} />
        <StatCard label="Confirmed Orders" value={String(data?.confirmed_orders ?? 0)} />
        <StatCard
          label="Revenue"
          value={formatPence(data?.total_revenue_pence ?? 0)}
        />
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white rounded-lg border p-6">
      <p className="text-sm text-gray-500 mb-1">{label}</p>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
    </div>
  );
}
