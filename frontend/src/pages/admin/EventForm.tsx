import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useAdminEvent } from '../../api/admin';
import { apiClient } from '../../api/client';
import MDEditor from '@uiw/react-md-editor';
import type { PriceBandTemplateEntry } from '../../types';

export default function AdminEventForm() {
  const { id } = useParams<{ id?: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const isEdit = Boolean(id);
  const { data: existing } = useAdminEvent(id);

  const [form, setForm] = useState({
    title: '',
    description: '',
    location: '',
    starts_at: '',
    ends_at: '',
    status: 'draft',
    sales_start_at: '',
    sales_end_at: '',
    banner_image_url: '',
    order_number_prefix: '',
  });
  const [templateBands, setTemplateBands] = useState<PriceBandTemplateEntry[]>([]);

  useEffect(() => {
    if (existing) {
      setForm({
        title: existing.title,
        description: existing.description,
        location: existing.location,
        starts_at: existing.starts_at.slice(0, 16),
        ends_at: existing.ends_at.slice(0, 16),
        status: existing.status,
        sales_start_at: existing.sales_start_at?.slice(0, 16) ?? '',
        sales_end_at: existing.sales_end_at?.slice(0, 16) ?? '',
        banner_image_url: existing.banner_image_url ?? '',
        order_number_prefix: existing.order_number_prefix ?? '',
      });
      setTemplateBands(existing.price_band_template ?? []);
    }
  }, [existing]);

  function addTemplateBand() {
    setTemplateBands((prev) => [...prev, { label: '', age_min: 0, age_max: 100, qualifier: null }]);
  }

  function updateTemplateBand(index: number, field: keyof PriceBandTemplateEntry, value: string | number | null) {
    setTemplateBands((prev) => prev.map((b, i) => (i === index ? { ...b, [field]: value } : b)));
  }

  function removeTemplateBand(index: number) {
    setTemplateBands((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const payload = {
      ...form,
      sales_start_at: form.sales_start_at || null,
      sales_end_at: form.sales_end_at || null,
      banner_image_url: form.banner_image_url || null,
      order_number_prefix: form.order_number_prefix.trim().toUpperCase() || null,
      price_band_template: templateBands.map((b) => ({
        ...b,
        qualifier: b.qualifier || null,
      })),
    };
    if (isEdit) {
      await apiClient.put(`/api/admin/events/${id}`, payload);
    } else {
      await apiClient.post('/api/admin/events', payload);
    }
    await qc.invalidateQueries({ queryKey: ['admin', 'events'] });
    navigate('/admin/events');
  }

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">
        {isEdit ? 'Edit Event' : 'New Event'}
      </h1>
      <form onSubmit={handleSubmit} className="space-y-4 bg-white border rounded-lg p-6">
        <Field label="Title">
          <input
            className="input"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            required
          />
        </Field>
        <Field label="Description">
          <div data-color-mode="light">
            <MDEditor
              value={form.description}
              onChange={(value) => setForm({ ...form, description: value ?? '' })}
              height={280}
              preview="edit"
              textareaProps={{
                placeholder: 'Write your event description using Markdown...',
              }}
            />
          </div>
          <p className="mt-1 text-xs text-gray-500">
            Supports Markdown (headings, bold, lists, links, quotes).
          </p>
        </Field>
        <Field label="Location">
          <input
            className="input"
            value={form.location}
            onChange={(e) => setForm({ ...form, location: e.target.value })}
          />
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Starts At">
            <input
              type="datetime-local"
              className="input"
              value={form.starts_at}
              onChange={(e) => setForm({ ...form, starts_at: e.target.value })}
              required
            />
          </Field>
          <Field label="Ends At">
            <input
              type="datetime-local"
              className="input"
              value={form.ends_at}
              onChange={(e) => setForm({ ...form, ends_at: e.target.value })}
              required
            />
          </Field>
        </div>
        <Field label="Status">
          <select
            className="input"
            value={form.status}
            onChange={(e) => setForm({ ...form, status: e.target.value })}
          >
            <option value="draft">Draft</option>
            <option value="published">Published</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Sales Start (optional)">
            <input
              type="datetime-local"
              className="input"
              value={form.sales_start_at}
              onChange={(e) => setForm({ ...form, sales_start_at: e.target.value })}
            />
          </Field>
          <Field label="Sales End (optional)">
            <input
              type="datetime-local"
              className="input"
              value={form.sales_end_at}
              onChange={(e) => setForm({ ...form, sales_end_at: e.target.value })}
            />
          </Field>
        </div>
        <Field label="Banner Image URL (optional)">
          <input
            className="input"
            type="url"
            placeholder="https://example.com/banner.jpg"
            value={form.banner_image_url}
            onChange={(e) => setForm({ ...form, banner_image_url: e.target.value })}
          />
          {form.banner_image_url && (
            <img
              src={form.banner_image_url}
              alt="Banner preview"
              className="mt-2 rounded-lg w-full object-cover max-h-40"
              onError={(e) => (e.currentTarget.style.display = 'none')}
            />
          )}
        </Field>
        <Field label="Order number prefix (optional)">
          <input
            className="input uppercase"
            placeholder="e.g. GBBO"
            maxLength={8}
            value={form.order_number_prefix}
            onChange={(e) => setForm({ ...form, order_number_prefix: e.target.value.replace(/[^A-Za-z0-9]/g, '').toUpperCase() })}
          />
          <p className="mt-1 text-xs text-gray-500">
            If set, order numbers will be prefixed, e.g. <span className="font-mono">GBBO-00001</span>. Leave blank for plain numbers like <span className="font-mono">00001</span>.
          </p>
        </Field>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Price band template</label>
          <p className="text-xs text-gray-500 mb-3">
            Define the age bands for this event. These will pre-populate the bands when creating a new ticket type.
          </p>
          <div className="space-y-2">
            {templateBands.map((band, index) => (
              <div key={index} className="grid grid-cols-[1fr_5rem_5rem_6rem_2rem] gap-2 items-center">
                <input
                  className="input text-sm"
                  placeholder="Label (e.g. Adult)"
                  value={band.label}
                  onChange={(e) => updateTemplateBand(index, 'label', e.target.value)}
                />
                <input
                  className="input text-sm"
                  type="number"
                  min={0}
                  max={130}
                  placeholder="Min age"
                  value={band.age_min}
                  onChange={(e) => updateTemplateBand(index, 'age_min', parseInt(e.target.value) || 0)}
                />
                <input
                  className="input text-sm"
                  type="number"
                  min={0}
                  max={130}
                  placeholder="Max age"
                  value={band.age_max}
                  onChange={(e) => updateTemplateBand(index, 'age_max', parseInt(e.target.value) || 0)}
                />
                <input
                  className="input text-sm"
                  placeholder="Qualifier"
                  value={band.qualifier ?? ''}
                  onChange={(e) => updateTemplateBand(index, 'qualifier', e.target.value || null)}
                />
                <button
                  type="button"
                  onClick={() => removeTemplateBand(index)}
                  className="text-red-500 hover:text-red-700 text-lg leading-none"
                  title="Remove band"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
          {templateBands.length > 0 && (
            <p className="text-xs text-gray-400 mt-1 grid grid-cols-[1fr_5rem_5rem_6rem_2rem] gap-2">
              <span>Label</span><span>Min age</span><span>Max age</span><span>Qualifier</span><span />
            </p>
          )}
          <button
            type="button"
            onClick={addTemplateBand}
            className="mt-2 text-sm text-sky-600 hover:underline"
          >
            + Add band
          </button>
        </div>
        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            className="bg-sky-600 text-white px-6 py-2 rounded font-medium hover:bg-sky-700"
          >
            {isEdit ? 'Save Changes' : 'Create Event'}
          </button>
          <button
            type="button"
            onClick={() => navigate('/admin/events')}
            className="border border-gray-300 px-6 py-2 rounded text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      {children}
    </div>
  );
}
