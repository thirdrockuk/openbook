import { Outlet, Link, useMatch } from 'react-router-dom';
import { useEvent } from '../api/events';

export default function Layout() {
  const eventMatch = useMatch('/events/:id');
  const checkoutMatch = useMatch('/events/:id/checkout');
  const eventId = eventMatch?.params.id ?? checkoutMatch?.params.id;
  const { data: event } = useEvent(eventId);
  const headerTitle = event?.title ?? 'OpenBook';
  const headerLink = eventId ? `/events/${eventId}` : '/';
  const canMakeBooking = Boolean(
    eventId &&
      !checkoutMatch &&
      event?.ticket_types?.some((ticketType) => ticketType.is_active)
  );

  return (
    <div className="min-h-screen bg-white">
      <header className="bg-white shadow-sm">
        <div className="max-w-[1172px] mx-auto px-4 lg:px-0 py-4 flex items-center justify-between">
          <Link
            to={headerLink}
            className="text-3xl sm:text-4xl font-bold leading-tight text-gray-900 truncate max-w-[70vw]"
          >
            {headerTitle}
          </Link>
          {canMakeBooking ? (
            <Link
              to={`/events/${eventId}/checkout`}
              className="inline-flex items-center rounded-lg bg-sky-600 px-6 py-3 text-base font-semibold text-white hover:bg-sky-700"
            >
              Make a booking
            </Link>
          ) : null}
        </div>
      </header>
      <main className="max-w-[1172px] mx-auto px-4 lg:px-0 py-8">
        <Outlet />
      </main>
    </div>
  );
}
