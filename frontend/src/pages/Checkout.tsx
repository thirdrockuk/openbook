import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useEvent } from '../api/events';
import { createOrder, confirmOrder } from '../api/orders';
import AttendeeForm, { type AttendeeInput } from '../components/AttendeeForm';
import BookerDetailsForm from '../components/BookerDetailsForm';
import OrderSummary from '../components/OrderSummary';
import { formatPence } from '../utils/currency';
import { ageAtEvent } from '../utils/age';
import type { PriceBand } from '../types';

type Step = 1 | 2 | 3;

interface BookerDetails {
  booker_name: string;
  booker_email: string;
  booker_email_confirm: string;
  booker_phone: string;
}

function getResolvedBand(
  ticketTypeId: string,
  dob: string,
  ticketTypes: { id: string; price_bands: PriceBand[] }[],
  eventStart: Date,
  isStudent: boolean = false
): PriceBand | null {
  const tt = ticketTypes.find((t) => t.id === ticketTypeId);
  if (!tt || !dob) return null;
  try {
    const d = new Date(dob);
    if (isNaN(d.getTime())) return null;
    const age = ageAtEvent(d, eventStart);
    const matching = tt.price_bands.filter((b) => age >= b.age_min && age <= b.age_max);
    if (!matching.length) return null;
    if (isStudent) {
      const studentBand = matching.find((b) => b.qualifier === 'student');
      if (studentBand) return studentBand;
    }
    return matching.find((b) => !b.qualifier) ?? matching[0];
  } catch {
    return null;
  }
}

export default function Checkout() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: event, isLoading } = useEvent(id);

  const [step, setStep] = useState<Step>(1);
  const [attendees, setAttendees] = useState<AttendeeInput[]>([
    {
      attendee_name: '',
      attendee_dob: '',
      ticket_type_id: '',
      is_student: false,
      dietary_requirements: '',
      access_requirements: '',
    },
  ]);
  const [booker, setBooker] = useState<BookerDetails>({
    booker_name: '',
    booker_email: '',
    booker_email_confirm: '',
    booker_phone: '',
  });
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (isLoading) return <div className="text-center py-12">Loading…</div>;
  if (!event) return <div className="text-center py-12 text-red-500">Event not found.</div>;

  const eventStart = new Date(event.starts_at);
  const activeTicketTypes = event.ticket_types
    .filter((t) => t.is_active)
    .sort((a, b) => a.sort_order - b.sort_order);

  function updateAttendee(index: number, updated: AttendeeInput) {
    setAttendees((prev) => prev.map((a, i) => (i === index ? updated : a)));
  }

  function removeAttendee(index: number) {
    setAttendees((prev) => prev.filter((_, i) => i !== index));
  }

  function addAttendee() {
    setAttendees((prev) => [
      ...prev,
      {
        attendee_name: '',
        attendee_dob: '',
        ticket_type_id: '',
        is_student: false,
        dietary_requirements: '',
        access_requirements: '',
      },
    ]);
  }

  const total = attendees.reduce((sum, a) => {
    const band = getResolvedBand(a.ticket_type_id, a.attendee_dob, activeTicketTypes, eventStart, a.is_student);
    return sum + (band?.price_pence ?? 0);
  }, 0);

  function validateStep1(): boolean {
    for (const a of attendees) {
      if (!a.attendee_name || !a.attendee_dob || !a.ticket_type_id) return false;
      const band = getResolvedBand(a.ticket_type_id, a.attendee_dob, activeTicketTypes, eventStart, a.is_student);
      if (!band) return false;
    }
    return true;
  }

  function validateStep2(): boolean {
    return (
      Boolean(booker.booker_name) &&
      Boolean(booker.booker_email) &&
      booker.booker_email === booker.booker_email_confirm
    );
  }

  async function handleSubmit() {
    setSubmitting(true);
    setError(null);
    try {
      const order = await createOrder({
        event_id: event!.id,
        booker_name: booker.booker_name,
        booker_email: booker.booker_email,
        booker_phone: booker.booker_phone || undefined,
        attendees: attendees.map((a) => ({
          ticket_type_id: a.ticket_type_id,
          attendee_name: a.attendee_name,
          attendee_dob: a.attendee_dob,
          is_student: a.is_student,
          dietary_requirements: a.dietary_requirements?.trim() || undefined,
          access_requirements: a.access_requirements?.trim() || undefined,
        })),
      });
      const confirmed = await confirmOrder(order.id);
      navigate(`/orders/${confirmed.id}/confirmation`);
    } catch (e: unknown) {
      const err = e as { response?: { data?: { detail?: string } } };
      setError(err?.response?.data?.detail ?? 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  const steps = [
    { label: 'Attendees', number: 1 },
    { label: 'Your details', number: 2 },
    { label: 'Review and pay', number: 3 },
  ];

  return (
    <div className="max-w-[60rem] mx-auto">
      <Link to={`/events/${event.id}`} className="text-sm text-sky-600 hover:underline mb-4 block">
        ← Back to event
      </Link>
      <h1 className="text-2xl font-bold text-gray-900 mb-2">{event.title}</h1>
      <p className="text-gray-700 text-sm mb-6">
        {eventStart.toLocaleDateString('en-GB', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        })}
      </p>

      {/* Step indicator */}
      <div className="flex items-center mb-8">
        {steps.map((s, i) => (
          <div key={s.number} className="flex items-center">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${
                step >= s.number
                  ? 'bg-sky-600 text-white'
                  : 'bg-white text-gray-700'
              }`}
            >
              {s.number}
            </div>
            <span
              className={`ml-2 text-sm ${
                step >= s.number ? 'text-sky-600 font-medium' : 'text-gray-700'
              }`}
            >
              {s.label}
            </span>
            {i < steps.length - 1 && <div className="mx-4 flex-1 h-px bg-white w-8" />}
          </div>
        ))}
      </div>

      {/* Step 1: Attendees */}
      {step === 1 && (
        <div>
          <h2 className="text-lg font-semibold mb-4">Add attendees</h2>
          <div className="space-y-4">
            {attendees.map((a, i) => (
              <AttendeeForm
                key={i}
                index={i}
                attendee={a}
                ticketTypes={activeTicketTypes}
                eventStart={eventStart}
                onChange={updateAttendee}
                onRemove={removeAttendee}
                canRemove={attendees.length > 1}
              />
            ))}
          </div>

          <button
            type="button"
            onClick={addAttendee}
            className="mt-4 text-sm text-sky-600 hover:underline"
          >
            + Add another attendee
          </button>

          <div className="mt-6 flex items-center justify-between">
            <div className="text-lg font-semibold">Total: {formatPence(total)}</div>
            <button
              onClick={() => setStep(2)}
              disabled={!validateStep1()}
              className="bg-sky-600 text-white px-6 py-2 rounded font-medium hover:bg-sky-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Continue
            </button>
          </div>
        </div>
      )}

      {/* Step 2: Booker details */}
      {step === 2 && (
        <div>
          <h2 className="text-lg font-semibold mb-4">Your details</h2>
          <BookerDetailsForm details={booker} onChange={setBooker} />
          <div className="mt-6 flex gap-4">
            <button
              onClick={() => setStep(1)}
              className="border border-gray-700 px-6 py-2 rounded font-medium text-gray-700 hover:bg-white"
            >
              Back
            </button>
            <button
              onClick={() => setStep(3)}
              disabled={!validateStep2()}
              className="bg-sky-600 text-white px-6 py-2 rounded font-medium hover:bg-sky-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Review order
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Review */}
      {step === 3 && (
        <div>
          <h2 className="text-lg font-semibold mb-4">Review and pay</h2>

          <div className="bg-white rounded-lg border p-4 mb-4">
            <h3 className="font-medium text-gray-700 mb-3">Order summary</h3>
            <OrderSummary
              attendees={attendees}
              ticketTypes={activeTicketTypes}
              eventStart={eventStart}
            />
          </div>

          <div className="bg-white rounded-lg border p-4 mb-4">
            <h3 className="font-medium text-gray-700 mb-2">Booker details</h3>
            <p className="text-sm text-gray-700">{booker.booker_name}</p>
            <p className="text-sm text-gray-700">{booker.booker_email}</p>
            {booker.booker_phone && (
              <p className="text-sm text-gray-700">{booker.booker_phone}</p>
            )}
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded p-3 mb-4 text-sm">
              {error}
            </div>
          )}

          <div className="flex gap-4">
            <button
              onClick={() => setStep(2)}
              className="border border-gray-700 px-6 py-2 rounded font-medium text-gray-700 hover:bg-white"
            >
              Back
            </button>
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="bg-green-600 text-white px-8 py-2 rounded font-semibold hover:bg-green-700 disabled:opacity-50"
            >
              {submitting ? 'Processing…' : `Complete booking — ${formatPence(total)}`}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
