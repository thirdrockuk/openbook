import { useParams, Link } from 'react-router-dom';
import { useEvent } from '../api/events';
import ReactMarkdown from 'react-markdown';
import { formatPence } from '../utils/currency';

export default function EventDetail() {
  const { id } = useParams<{ id: string }>();
  const { data: event, isLoading, error } = useEvent(id);

  if (isLoading) return <div className="text-center py-12 text-gray-700">Loading…</div>;
  if (error || !event)
    return <div className="text-center py-12 text-red-500">Event not found.</div>;

  const start = new Date(event.starts_at);
  const end = new Date(event.ends_at);
  const activeTicketTypes = event.ticket_types
    .filter((t) => t.is_active)
    .sort((a, b) => a.sort_order - b.sort_order);
  const hasActiveTicketTypes = activeTicketTypes.length > 0;
  const ticketPriceTiers = activeTicketTypes.map((ticketType) => ({
    id: ticketType.id,
    name: ticketType.name,
    bands: [...ticketType.price_bands].sort((a, b) => b.age_min - a.age_min),
  }));
  const locationText = event.location?.trim() || '';
  const mapEmbedUrl = locationText
    ? `https://www.google.com/maps?q=${encodeURIComponent(locationText)}&output=embed`
    : null;

  return (
    <div className="pb-24 sm:pb-0">
      {event.banner_image_url && (
        <div className="mb-6 overflow-hidden bg-white">
          <img
            src={event.banner_image_url}
            alt={event.title}
            className="h-64 w-full object-cover sm:h-80 lg:h-[26rem]"
          />
        </div>
      )}

      <div className="mx-auto">
        <div className="mb-4">
          <div>
            <p className="text-xl sm:text-2xl text-gray-700 mb-1">
              {start.toLocaleDateString('en-GB', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}{' '}
              — {end.toLocaleDateString('en-GB', { year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
            <p className="text-gray-700 inline-flex items-center gap-1.5">
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                className="h-4 w-4"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 22s7-6.2 7-12a7 7 0 1 0-14 0c0 5.8 7 12 7 12z" />
                <circle cx="12" cy="10" r="2.5" />
              </svg>
              <span>{event.location?.trim() || 'TBC'}</span>
            </p>
          </div>
        </div>

        <div className="relative left-1/2 right-1/2 mb-8 -ml-[50vw] -mr-[50vw] w-screen bg-sky-600 py-8">
          <div className="mx-auto max-w-[1172px] px-4 lg:px-0">
            <div className="grid gap-6 lg:grid-cols-12 lg:items-start">
              <div className="lg:col-span-9">
                <div className="text-base text-white">
                  <ReactMarkdown
                    components={{
                      h1: ({ children }) => <h1 className="text-3xl font-bold mb-3">{children}</h1>,
                      h2: ({ children }) => <h2 className="text-2xl font-semibold mb-3">{children}</h2>,
                      h3: ({ children }) => <h3 className="text-xl font-semibold mb-2">{children}</h3>,
                      p: ({ children }) => <p className="mb-4 leading-relaxed">{children}</p>,
                      ul: ({ children }) => <ul className="mb-4 list-disc pl-6 space-y-1">{children}</ul>,
                      ol: ({ children }) => <ol className="mb-4 list-decimal pl-6 space-y-1">{children}</ol>,
                      li: ({ children }) => <li>{children}</li>,
                      a: ({ children, href }) => (
                        <a
                          href={href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="underline decoration-white/70 underline-offset-2 hover:decoration-white"
                        >
                          {children}
                        </a>
                      ),
                      strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                      blockquote: ({ children }) => (
                        <blockquote className="mb-4 border-l-4 border-white/50 pl-4 italic text-white/95">
                          {children}
                        </blockquote>
                      ),
                    }}
                  >
                    {event.description || ''}
                  </ReactMarkdown>
                </div>
                {hasActiveTicketTypes && (
                  <div className="mt-6">
                    <Link
                      to={`/events/${event.id}/checkout`}
                      className="inline-flex items-center rounded-lg border-2 border-white bg-white px-7 py-3 text-base font-semibold text-sky-600 shadow-sm hover:bg-sky-50"
                    >
                      Make a booking
                    </Link>
                  </div>
                )}
            </div>
              {hasActiveTicketTypes && (
                <div className="lg:col-span-3">
                  <div className="rounded-lg bg-white p-4 text-gray-700 shadow-sm">
                    <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-900 mb-2">Ticket prices</h3>
                    <div className="space-y-3">
                      {ticketPriceTiers.map((ticket) => (
                        <div key={ticket.id}>
                          <p className="text-sm font-semibold text-gray-900">{ticket.name}</p>
                          {ticket.bands.length ? (
                            <div className="mt-1 space-y-1">
                              {ticket.bands.map((band) => (
                                <p key={band.id} className="flex items-baseline justify-between gap-3 text-sm">
                                  <span className="truncate text-gray-700">{band.label}</span>
                                  <span className="font-semibold whitespace-nowrap">{formatPence(band.price_pence)}</span>
                                </p>
                              ))}
                            </div>
                          ) : (
                            <p className="mt-1 text-sm text-gray-700">Price TBC</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <section className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-3">Location</h2>
          <p className="text-gray-700 mb-3">{locationText || 'TBC'}</p>
          {mapEmbedUrl ? (
            <div className="overflow-hidden rounded-xl border border-gray-700 bg-white">
              <iframe
                title={`Map for ${event.title}`}
                src={mapEmbedUrl}
                className="h-72 w-full"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
            </div>
          ) : (
            <p className="text-sm text-gray-700">Add an event location to show a map.</p>
          )}
        </section>

      </div>

      {hasActiveTicketTypes && (
        <div className="fixed inset-x-0 bottom-0 z-20 border-t border-gray-700 bg-white/95 px-4 py-3 backdrop-blur sm:hidden">
          <Link
            to={`/events/${event.id}/checkout`}
            className="block w-full text-center bg-sky-600 text-white px-6 py-3.5 rounded-lg text-base font-semibold hover:bg-sky-700"
          >
            Make a booking
          </Link>
        </div>
      )}
    </div>
  );
}
