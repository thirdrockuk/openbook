import type { TicketType } from '../types';
import { formatPence } from '../utils/currency';

interface Props {
  ticketType: TicketType;
}

export default function TicketTypePanel({ ticketType }: Props) {
  return (
    <div className="border rounded-lg p-4 bg-white">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="font-semibold text-gray-900">{ticketType.name}</h3>
          {ticketType.description && (
            <p className="text-sm text-gray-700 mt-1">{ticketType.description}</p>
          )}
        </div>
        {ticketType.available !== undefined && ticketType.available !== null && (
          <span className="text-xs text-gray-700 bg-white px-2 py-1 rounded">
            {ticketType.available} left
          </span>
        )}
      </div>
      <div className="mt-3 space-y-1">
        {[...ticketType.price_bands]
          .sort((a, b) => b.age_min - a.age_min || (a.qualifier ?? '').localeCompare(b.qualifier ?? ''))
          .map((band) => (
          <div key={band.id} className="flex justify-between text-sm">
            <span className="text-gray-700">
              {band.label} ({band.age_min}–{band.age_max} yrs)
            </span>
            <span className="font-medium text-gray-700">{formatPence(band.price_pence)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
