import { Link } from 'react-router-dom';
import type { Event } from '../types';

interface Props {
  event: Event;
}

export default function EventCard({ event }: Props) {
  const start = new Date(event.starts_at);
  return (
    <article className="group overflow-hidden rounded-xl border border-gray-700 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      {event.banner_image_url ? (
        <img
          src={event.banner_image_url}
          alt={event.title}
          className="h-44 w-full object-cover"
        />
      ) : (
        <div className="h-44 w-full bg-gradient-to-br from-indigo-100 via-white to-sky-100" />
      )}

      <div className="p-5">
        <p className="mb-2 inline-flex rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-medium text-indigo-700">
          {start.toLocaleDateString('en-GB', {
            weekday: 'short',
            day: 'numeric',
            month: 'short',
            year: 'numeric',
          })}
        </p>

        <h2 className="text-xl font-semibold text-gray-900">{event.title}</h2>

        {event.location && <p className="mt-1 text-sm text-gray-700">{event.location}</p>}

        <p className="mt-3 line-clamp-3 text-sm text-gray-700">{event.description}</p>

        <Link
          to={`/events/${event.id}`}
          className="mt-5 inline-flex items-center rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-700"
        >
          View details
        </Link>
      </div>
    </article>
  );
}
