import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../api/client';
import { useAdminEvent } from '../../api/admin';

interface PriceBandInput {
  label: string;
  age_min: string;
  age_max: string;
  price_pounds: string;
  venue_fee_pounds: string;
  qualifier: string;
}

const MAX_AGE = '100';

const DEFAULT_BANDS: PriceBandInput[] = [
  { label: 'Adult', age_min: '18', age_max: MAX_AGE, price_pounds: '', venue_fee_pounds: '', qualifier: '' },
  { label: 'Child', age_min: '0', age_max: '17', price_pounds: '', venue_fee_pounds: '', qualifier: '' },
];

export default function AdminTicketTypeForm() {
  const { id: eventId, tid } = useParams<{ id: string; tid: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const isEditing = Boolean(tid);

  const { data: event } = useAdminEvent(eventId);

  const [form, setForm] = useState({
    name: '',
    description: '',
    inventory_total: '',
    is_active: true,
    sort_order: '0',
  });
  const [bands, setBands] = useState<PriceBandInput[]>([]);
  const [initialised, setInitialised] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    if (!event || initialised) return;

    if (isEditing) {
      const existing = event.ticket_types.find((t) => t.id === tid);
      if (!existing) return;
      setForm({
        name: existing.name,
        description: existing.description ?? '',
        inventory_total: existing.inventory_total != null ? String(existing.inventory_total) : '',
        is_active: existing.is_active,
        sort_order: String(existing.sort_order),
      });
      setBands(
        [...existing.price_bands]
          .sort((a, b) => b.age_min - a.age_min || (a.qualifier ?? '').localeCompare(b.qualifier ?? ''))
          .map((b) => ({
            label: b.label,
            age_min: String(b.age_min),
            age_max: String(b.age_max),
            price_pounds: (b.price_pence / 100).toFixed(2),
            venue_fee_pounds: ((b.venue_fee_pence ?? 0) / 100).toFixed(2),
            qualifier: b.qualifier ?? '',
          }))
      );
    } else {
      // Pre-populate from the event's price band template, falling back to DEFAULT_BANDS
      const template = event.price_band_template;
      const defaultBands = template.length > 0
        ? template.map((b) => ({
            label: b.label,
            age_min: String(b.age_min),
            age_max: String(b.age_max),
            price_pounds: '',
            venue_fee_pounds: '',
            qualifier: b.qualifier ?? '',
          }))
        : DEFAULT_BANDS;
      setBands(defaultBands);
    }
    setInitialised(true);
  }, [event, initialised, isEditing, tid]);

  function updateBand(index: number, field: keyof PriceBandInput, value: string) {
    setBands((prev) => prev.map((b, i) => (i === index ? { ...b, [field]: value } : b)));
  }

  function addBand() {
    setBands((prev) => [...prev, {
      label: '',
      age_min: '',
      age_max: '',
      price_pounds: '',
      venue_fee_pounds: '0',
      qualifier: '',
    }]);
  }

  function removeBand(index: number) {
    setBands((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitError(null);

    const parsedBands = bands.map((b) => ({
      label: b.label,
      age_min: parseInt(b.age_min),
      age_max: parseInt(b.age_max),
      price_pence: Math.round(parseFloat(b.price_pounds || '0') * 100),
      venue_fee_pence: b.venue_fee_pounds ? Math.round(parseFloat(b.venue_fee_pounds) * 100) : 0,
      qualifier: b.qualifier || null,
    }));

    const invalidVenueFee = parsedBands.find(
      (b) => Number.isFinite(b.price_pence) && Number.isFinite(b.venue_fee_pence) && b.venue_fee_pence > b.price_pence
    );
    if (invalidVenueFee) {
      setSubmitError('Venue fee must not exceed the ticket price in any band.');
      return;
    }

    const payload = {
      name: form.name,
      description: form.description,
      inventory_total: form.inventory_total ? parseInt(form.inventory_total) : null,
      is_active: form.is_active,
      sort_order: parseInt(form.sort_order),
      price_bands: parsedBands,
    };
    try {
      if (isEditing) {
        await apiClient.put(`/api/admin/events/${eventId}/ticket-types/${tid}`, payload);
      } else {
        await apiClient.post(`/api/admin/events/${eventId}/ticket-types`, payload);
      }
      await qc.invalidateQueries({ queryKey: ['admin', 'events', eventId] });
      navigate(`/admin/events/${eventId}/ticket-types`);
    } catch {
      setSubmitError('Unable to save ticket type. Please check your price band values.');
    }
  }

  if (isEditing && !initialised) return <div className="text-gray-500">Loading…</div>;

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">
        {isEditing ? 'Edit Ticket Type' : 'New Ticket Type'}
      </h1>
      <form onSubmit={handleSubmit} className="space-y-6">
        {submitError && (
          <p className="text-sm text-red-600">{submitError}</p>
        )}
        <div className="bg-white border rounded-lg p-6 space-y-4">
          <h2 className="font-semibold text-gray-800">Ticket Type Details</h2>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
            <input
              className="w-full border rounded px-3 py-2 text-sm"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="e.g. En Suite, Camping Full Board"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              className="w-full border rounded px-3 py-2 text-sm"
              rows={2}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Inventory (leave blank = unlimited)
              </label>
              <input
                type="number"
                className="w-full border rounded px-3 py-2 text-sm"
                value={form.inventory_total}
                onChange={(e) => setForm({ ...form, inventory_total: e.target.value })}
                min="0"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Sort Order</label>
              <input
                type="number"
                className="w-full border rounded px-3 py-2 text-sm"
                value={form.sort_order}
                onChange={(e) => setForm({ ...form, sort_order: e.target.value })}
              />
            </div>
          </div>
        </div>

        <div className="bg-white border rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-800">Price Bands</h2>
            <button
              type="button"
              onClick={addBand}
              className="text-sm text-sky-600 hover:underline"
            >
              + Add Band
            </button>
          </div>
          <div className="space-y-3">
            {bands.map((band, i) => (
              <div key={i} className="grid grid-cols-7 gap-2 items-center">
                <input
                  className="border rounded px-2 py-1 text-sm col-span-1"
                  placeholder="Label"
                  value={band.label}
                  onChange={(e) => updateBand(i, 'label', e.target.value)}
                  required
                />
                <input
                  type="number"
                  className="border rounded px-2 py-1 text-sm"
                  placeholder="Min age"
                  value={band.age_min}
                  onChange={(e) => updateBand(i, 'age_min', e.target.value)}
                  min="0"
                  required
                />
                <input
                  type="number"
                  className="border rounded px-2 py-1 text-sm"
                  placeholder="Max age"
                  value={band.age_max}
                  onChange={(e) => updateBand(i, 'age_max', e.target.value)}
                  min="0"
                  required
                />
                <input
                  type="number"
                  step="0.01"
                  className="border rounded px-2 py-1 text-sm"
                  placeholder="Price (£)"
                  value={band.price_pounds}
                  onChange={(e) => updateBand(i, 'price_pounds', e.target.value)}
                  min="0"
                  required
                />
                <input
                  type="number"
                  step="0.01"
                  className="border rounded px-2 py-1 text-sm"
                  placeholder="Venue fee (£)"
                  value={band.venue_fee_pounds}
                  onChange={(e) => updateBand(i, 'venue_fee_pounds', e.target.value)}
                  min="0"
                  required
                />
                <select
                  className="border rounded px-2 py-1 text-sm"
                  value={band.qualifier}
                  onChange={(e) => updateBand(i, 'qualifier', e.target.value)}
                >
                  <option value="">Standard</option>
                  <option value="student">Student</option>
                </select>
                <button
                  type="button"
                  onClick={() => removeBand(i)}
                  className="text-red-400 hover:text-red-600 text-sm"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-400 mt-3">Price and venue fee are entered in pounds (e.g. 149.00 = £149.00). Venue fee must not exceed price.</p>
        </div>

        <div className="flex gap-3">
          <button
            type="submit"
            className="bg-sky-600 text-white px-6 py-2 rounded font-medium hover:bg-sky-700"
          >
            {isEditing ? 'Save Changes' : 'Create Ticket Type'}
          </button>
          <button
            type="button"
            onClick={() => navigate(`/admin/events/${eventId}/ticket-types`)}
            className="border border-gray-300 px-6 py-2 rounded text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
