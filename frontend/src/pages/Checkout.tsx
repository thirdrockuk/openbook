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
  const [direction, setDirection] = useState<'forward' | 'backward'>('forward');

  function goTo(newStep: Step) {
    setDirection(newStep > step ? 'forward' : 'backward');
    setStep(newStep);
  }
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
  const [paymentMethod, setPaymentMethod] = useState<'bank_transfer' | 'card' | null>(null);

  if (isLoading) return <div role="status" className="text-center py-12 text-gray-500">Loading…</div>;
  if (!event) return <div className="text-center py-12 text-red-500">Event not found.</div>;

  const eventStart = new Date(event.starts_at);
  const allowedMethods = [
    ...(event.allow_bank_transfer ? ['bank_transfer' as const] : []),
    ...(event.allow_card_payment ? ['card' as const] : []),
  ];
  // Auto-select if only one method available
  const effectivePaymentMethod = allowedMethods.length === 1 ? allowedMethods[0] : paymentMethod;
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
        payment_method: effectivePaymentMethod ?? undefined,
        attendees: attendees.map((a) => ({
          ticket_type_id: a.ticket_type_id,
          attendee_name: a.attendee_name,
          attendee_dob: a.attendee_dob,
          is_student: a.is_student,
          dietary_requirements: a.dietary_requirements?.trim() || undefined,
          access_requirements: a.access_requirements?.trim() || undefined,
        })),
      });
      if (effectivePaymentMethod === 'card') {
        // Don't confirm yet — Confirmation page handles Stripe payment first
        navigate(`/orders/${order.id}/confirmation`, { state: { paymentMethod: 'card' } });
      } else {
        const confirmed = await confirmOrder(order.id);
        navigate(`/orders/${confirmed.id}/confirmation`, { state: { paymentMethod: effectivePaymentMethod } });
      }
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
      <Link to={`/events/${event.id}`} className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 mb-4 transition-colors">
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
        </svg>
        Back to event
      </Link>

      {/* Step indicator */}
      <div className="flex items-center mb-8">
        {steps.map((s, i) => (
          <div key={s.number} className="flex items-center">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${
                step >= s.number
                  ? 'bg-sky-600 text-white'
                  : 'bg-gray-100 text-gray-500 border border-gray-200'
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
            {i < steps.length - 1 && <div className="mx-4 flex-1 h-px bg-gray-200 w-8" />}
          </div>
        ))}
      </div>

      <div key={step} className={`px-0.5 overflow-x-hidden ${direction === 'forward' ? 'step-slide-forward' : 'step-slide-backward'}`}>

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
              <div className="text-base font-semibold text-gray-900">Total: {formatPence(total)}</div>
              <button
                type="button"
                onClick={() => goTo(2)}
                disabled={!validateStep1()}
                className="bg-sky-600 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-sky-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
            <div className="mt-6 flex items-center justify-between">
              <button
                type="button"
                onClick={() => goTo(1)}
                className="border border-gray-200 px-6 py-2 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Back
              </button>
              <button
                type="button"
                onClick={() => goTo(3)}
                disabled={!validateStep2()}
                className="bg-sky-600 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-sky-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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

            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 mb-4">
              <h3 className="font-medium text-gray-700 mb-3">Order summary</h3>
              <OrderSummary
                attendees={attendees}
                ticketTypes={activeTicketTypes}
                eventStart={eventStart}
              />
            </div>

            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 mb-4">
              <h3 className="font-medium text-gray-700 mb-2">Booker details</h3>
              <p className="text-sm text-gray-700">{booker.booker_name}</p>
              <p className="text-sm text-gray-700">{booker.booker_email}</p>
              {booker.booker_phone && (
                <p className="text-sm text-gray-700">{booker.booker_phone}</p>
              )}
            </div>

            {allowedMethods.length > 1 && (
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 mb-4">
                <h3 className="font-medium text-gray-700 mb-3">Payment method</h3>
                <div className="space-y-2">
                  {event.allow_bank_transfer && (
                    <label className="flex items-start gap-3 cursor-pointer">
                      <input
                        type="radio"
                        name="payment_method"
                        value="bank_transfer"
                        checked={paymentMethod === 'bank_transfer'}
                        onChange={() => setPaymentMethod('bank_transfer')}
                        className="mt-0.5"
                      />
                      <div>
                        <p className="text-sm font-medium text-gray-900">Bank transfer</p>
                        <p className="text-xs text-gray-500">Pay by bank transfer — details shown after booking</p>
                      </div>
                    </label>
                  )}
                  {event.allow_card_payment && (
                    <label className="flex items-start gap-3 cursor-pointer">
                      <input
                        type="radio"
                        name="payment_method"
                        value="card"
                        checked={paymentMethod === 'card'}
                        onChange={() => setPaymentMethod('card')}
                        className="mt-0.5"
                      />
                      <div>
                        <p className="text-sm font-medium text-gray-900">Card payment</p>
                        <p className="text-xs text-gray-500">Pay securely by card</p>
                      </div>
                    </label>
                  )}
                </div>
              </div>
            )}

            {error && (
              <div role="alert" className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 mb-4 text-sm">
                {error}
              </div>
            )}

            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => goTo(2)}
                className="border border-gray-200 px-6 py-2 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Back
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={submitting || !effectivePaymentMethod}
                className="bg-sky-600 text-white px-8 py-2 rounded-lg text-sm font-medium hover:bg-sky-700 transition-colors disabled:opacity-50"
              >
                {submitting ? 'Processing…' : `Complete booking — ${formatPence(total)}`}
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
