import { Navigate } from 'react-router-dom';
import { useEvents } from '../api/events';

export default function PublicHome() {
  const { data: events, isLoading, error } = useEvents();

  if (isLoading) return <div className="text-center py-12 text-gray-700">Loading event...</div>;
  if (error) return <div className="text-center py-12 text-red-500">Failed to load event.</div>;
  if (!events?.length) return <div className="text-center py-12 text-gray-700">No events available.</div>;

  const primaryEvent = [...events].sort((a, b) =>
    new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime()
  )[0];

  return <Navigate to={`/events/${primaryEvent.id}`} replace />;
}
