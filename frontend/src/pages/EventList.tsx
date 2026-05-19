import { useEvents } from '../api/events';
import EventCard from '../components/EventCard';

export default function EventList() {
  const { data: events, isLoading, error } = useEvents();

  if (isLoading) return <div className="text-center py-12 text-gray-700">Loading events...</div>;
  if (error) return <div className="text-center py-12 text-red-500">Failed to load events.</div>;
  if (!events?.length) {
    return (
      <div className="space-y-6">
        <section className="rounded-2xl border border-indigo-100 bg-gradient-to-r from-indigo-50 to-white p-8">
          <h1 className="text-3xl font-bold text-gray-900">Upcoming Events</h1>
          <p className="mt-2 max-w-2xl text-sm text-gray-700">
            Browse available events and reserve your place in just a few steps.
          </p>
        </section>
        <div className="rounded-xl border border-dashed border-gray-700 bg-white p-8 text-center text-gray-700">
          No events available.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <section className="rounded-2xl border border-indigo-100 bg-gradient-to-r from-indigo-50 to-white p-8">
        <p className="text-xs font-semibold uppercase tracking-widest text-indigo-600">OpenBook</p>
        <h1 className="mt-2 text-3xl font-bold text-gray-900 sm:text-4xl">Upcoming Events</h1>
        <p className="mt-3 max-w-2xl text-sm text-gray-700 sm:text-base">
          Pick an event, add attendees, and complete booking with a clear step-by-step checkout.
        </p>
      </section>

      <div className="grid gap-6 md:grid-cols-2">
        {events.map((event) => (
          <EventCard key={event.id} event={event} />
        ))}
      </div>
    </div>
  );
}
