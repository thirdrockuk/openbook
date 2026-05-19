import type { AttendeeInput } from './AttendeeForm';
import type { TicketType, PriceBand } from '../types';
import { formatPence } from '../utils/currency';
import { ageAtEvent } from '../utils/age';

interface Props {
  attendees: AttendeeInput[];
  ticketTypes: TicketType[];
  eventStart: Date;
}

function resolveBand(tt: TicketType | undefined, dob: string, eventStart: Date): PriceBand | null {
  if (!tt || !dob) return null;
  try {
    const d = new Date(dob);
    if (isNaN(d.getTime())) return null;
    const age = ageAtEvent(d, eventStart);
    return tt.price_bands.find((b) => age >= b.age_min && age <= b.age_max) ?? null;
  } catch {
    return null;
  }
}

export default function OrderSummary({ attendees, ticketTypes, eventStart }: Props) {
  const rows = attendees.map((a) => {
    const tt = ticketTypes.find((t) => t.id === a.ticket_type_id);
    const band = resolveBand(tt, a.attendee_dob, eventStart);
    return { attendee: a, tt, band, price: band?.price_pence ?? 0 };
  });

  const total = rows.reduce((sum, r) => sum + r.price, 0);

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left text-gray-700">
            <th className="pb-2 font-medium">Attendee</th>
            <th className="pb-2 font-medium">Ticket type</th>
            <th className="pb-2 font-medium">Price band</th>
            <th className="pb-2 font-medium text-right">Price</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-b">
              <td className="py-2">
                <span>{r.attendee.attendee_name || '—'}</span>
                {r.attendee.dietary_requirements?.trim() && (
                  <p className="text-xs text-gray-700 mt-0.5">
                    <span className="font-medium">Dietary:</span> {r.attendee.dietary_requirements.trim()}
                  </p>
                )}
                {r.attendee.access_requirements?.trim() && (
                  <p className="text-xs text-gray-700 mt-0.5">
                    <span className="font-medium">Access:</span> {r.attendee.access_requirements.trim()}
                  </p>
                )}
              </td>
              <td className="py-2">{r.tt?.name ?? '—'}</td>
              <td className="py-2">{r.band?.label ?? '—'}</td>
              <td className="py-2 text-right">{formatPence(r.price)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <td colSpan={3} className="pt-3 font-semibold text-gray-900">
              Total
            </td>
            <td className="pt-3 font-semibold text-gray-900 text-right">{formatPence(total)}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
