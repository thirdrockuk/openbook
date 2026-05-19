import { useEffect, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import StatusBadge from '../../components/StatusBadge';
import {
  updateAdminEventAttendeeReportSettings,
  useAdminEventAttendeeReport,
} from '../../api/admin';
import type { EventAttendeeReportAgeTab, EventAttendeeReportAttendee } from '../../types';
import { formatDate } from '../../utils/date';

type AgeTab = {
  id: string;
  label: string;
  minAge: number;
  maxAge: number;
};

const DEFAULT_AGE_TABS: AgeTab[] = [
  { id: 'children', label: 'Children', minAge: 0, maxAge: 11 },
  { id: 'teens', label: 'Teens', minAge: 12, maxAge: 17 },
  { id: 'adults', label: 'Adults', minAge: 18, maxAge: 64 },
  { id: 'seniors', label: 'Seniors', minAge: 65, maxAge: 120 },
];

function buildDefaultAgeTabs(): AgeTab[] {
  return DEFAULT_AGE_TABS.map((tab) => ({ ...tab }));
}

function parseAgeInput(value: string): number {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) return 0;
  return Math.max(0, parsed);
}

function normaliseBounds(tab: AgeTab): { minAge: number; maxAge: number } {
  const minAge = Math.min(tab.minAge, tab.maxAge);
  const maxAge = Math.max(tab.minAge, tab.maxAge);
  return { minAge, maxAge };
}

function attendeeInTab(attendee: EventAttendeeReportAttendee, tab: AgeTab): boolean {
  const { minAge, maxAge } = normaliseBounds(tab);
  return attendee.attendee_age >= minAge && attendee.attendee_age <= maxAge;
}



function toUiAgeTabs(ageTabs: EventAttendeeReportAgeTab[]): AgeTab[] {
  return ageTabs.map((tab, index) => ({
    id: `saved-${index}-${Math.random().toString(16).slice(2)}`,
    label: tab.label,
    minAge: tab.min_age,
    maxAge: tab.max_age,
  }));
}

function toApiAgeTabs(ageTabs: AgeTab[]): EventAttendeeReportAgeTab[] {
  return ageTabs.map((tab) => {
    const { minAge, maxAge } = normaliseBounds(tab);
    return {
      label: tab.label.trim() || 'Untitled',
      min_age: minAge,
      max_age: maxAge,
    };
  });
}

export default function AdminEventAttendeeReport() {
  const { id: eventId } = useParams<{ id: string }>();
  const qc = useQueryClient();
  const [includePending, setIncludePending] = useState(false);
  const [ageTabs, setAgeTabs] = useState<AgeTab[]>(() => buildDefaultAgeTabs());
  const [activeTabId, setActiveTabId] = useState(DEFAULT_AGE_TABS[0].id);
  const [tabsInitialisedForEvent, setTabsInitialisedForEvent] = useState<string | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveFeedback, setSaveFeedback] = useState<string | null>(null);

  const { data: report, isLoading: isReportLoading } = useAdminEventAttendeeReport(
    eventId,
    includePending
  );

  useEffect(() => {
    setTabsInitialisedForEvent(null);
    setAgeTabs(buildDefaultAgeTabs());
    setActiveTabId(DEFAULT_AGE_TABS[0].id);
    setIsDirty(false);
    setSaveError(null);
    setSaveFeedback(null);
  }, [eventId]);

  useEffect(() => {
    if (!report || !eventId) {
      return;
    }

    if (tabsInitialisedForEvent === eventId) {
      return;
    }

    const loadedTabs = report.age_tabs.length > 0 ? toUiAgeTabs(report.age_tabs) : buildDefaultAgeTabs();
    setAgeTabs(loadedTabs);
    setActiveTabId(loadedTabs[0]?.id ?? DEFAULT_AGE_TABS[0].id);
    setTabsInitialisedForEvent(eventId);
    setIsDirty(false);
    setSaveError(null);
    setSaveFeedback(null);
  }, [report, eventId, tabsInitialisedForEvent]);

  useEffect(() => {
    if (ageTabs.length === 0) {
      return;
    }

    const hasActiveTab = ageTabs.some((tab) => tab.id === activeTabId);
    if (!hasActiveTab) {
      setActiveTabId(ageTabs[0].id);
    }
  }, [ageTabs, activeTabId]);

  const attendees = report?.attendees ?? [];

  const tabsWithAttendees = useMemo(
    () =>
      ageTabs.map((tab) => ({
        ...tab,
        attendees: attendees.filter((attendee) => attendeeInTab(attendee, tab)),
      })),
    [ageTabs, attendees]
  );

  const outsideDefinedRanges = useMemo(
    () =>
      attendees.filter(
        (attendee) => !ageTabs.some((tab) => attendeeInTab(attendee, tab))
      ),
    [ageTabs, attendees]
  );

  const activeTab =
    tabsWithAttendees.find((tab) => tab.id === activeTabId) ?? tabsWithAttendees[0] ?? null;

  function updateTab(tabId: string, updates: Partial<AgeTab>) {
    setAgeTabs((currentTabs) =>
      currentTabs.map((tab) => (tab.id === tabId ? { ...tab, ...updates } : tab))
    );
    setIsDirty(true);
    setSaveFeedback(null);
  }

  function addTab() {
    const newTab: AgeTab = {
      id: `custom-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      label: `Range ${ageTabs.length + 1}`,
      minAge: 0,
      maxAge: 0,
    };
    setAgeTabs((currentTabs) => [...currentTabs, newTab]);
    setActiveTabId(newTab.id);
    setIsDirty(true);
    setSaveFeedback(null);
  }

  function removeTab(tabId: string) {
    setAgeTabs((currentTabs) => {
      if (currentTabs.length <= 1) {
        return currentTabs;
      }
      return currentTabs.filter((tab) => tab.id !== tabId);
    });
    setIsDirty(true);
    setSaveFeedback(null);
  }

  async function handleSaveTabs() {
    if (!eventId) {
      return;
    }

    setIsSaving(true);
    setSaveError(null);
    setSaveFeedback(null);
    try {
      const payload = toApiAgeTabs(ageTabs);
      await updateAdminEventAttendeeReportSettings(eventId, payload);
      setIsDirty(false);
      setSaveFeedback('Age tabs saved.');
      qc.invalidateQueries({ queryKey: ['admin', 'events', eventId, 'attendee-report'] });
    } catch {
      setSaveError('Failed to save age tabs.');
    } finally {
      setIsSaving(false);
    }
  }

  if (isReportLoading) {
    return <div role="status" className="text-gray-500">Loading...</div>;
  }

  if (!report) {
    return <div className="text-red-500">Event report not found.</div>;
  }

  return (
    <div>
      <div className="mb-6">
        <Link to={`/admin/events/${eventId}`} className="text-sm text-sky-600 hover:underline">
          ← Back to event
        </Link>
        <h1 className="text-2xl font-bold text-gray-900 mt-1">Attendee age report</h1>
        <p className="text-sm text-gray-500 mt-1">
          {report.event_title} | Event date: {formatDate(report.event_starts_at)}
        </p>
      </div>

      <div className="bg-white border rounded-lg p-5 mb-4">
        <div className="flex items-center justify-between gap-4 flex-wrap mb-3">
          <h2 className="font-semibold text-gray-800">Report scope</h2>
          <label className="inline-flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={includePending}
              onChange={(e) => setIncludePending(e.target.checked)}
              className="h-4 w-4"
            />
            Include pending orders
          </label>
        </div>
        <p className="text-sm text-gray-500">
          Showing {attendees.length} attendees from
          {includePending ? ' confirmed and pending orders.' : ' confirmed orders only.'}
        </p>
      </div>

      <div className="bg-white border rounded-lg p-5 mb-4">
        <div className="flex items-center justify-between gap-3 mb-3">
          <h2 className="font-semibold text-gray-800">Age tabs</h2>
          <div className="flex items-center gap-2">
            {isDirty && (
              <span className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1">
                Unsaved changes
              </span>
            )}
            <button
              type="button"
              onClick={addTab}
              className="text-sm px-3 py-1.5 rounded bg-sky-600 text-white hover:bg-sky-700"
            >
              + Add Tab
            </button>
            <button
              type="button"
              onClick={handleSaveTabs}
              disabled={!isDirty || isSaving}
              className="text-sm px-3 py-1.5 rounded border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:text-gray-400 disabled:border-gray-200 disabled:hover:bg-transparent"
            >
              {isSaving ? 'Saving...' : 'Save tabs'}
            </button>
          </div>
        </div>

        {saveError && <p role="alert" className="text-xs text-red-600 mb-2">{saveError}</p>}
        {saveFeedback && <p className="text-xs text-green-700 mb-2">{saveFeedback}</p>}

        <div className="space-y-3">
          {ageTabs.map((tab) => (
            <div key={tab.id} className="grid grid-cols-1 md:grid-cols-12 gap-2">
              <input
                type="text"
                value={tab.label}
                onChange={(e) => updateTab(tab.id, { label: e.target.value })}
                className="border rounded px-3 py-2 text-sm md:col-span-6"
                placeholder="Tab label"
              />
              <input
                type="number"
                min={0}
                value={tab.minAge}
                onChange={(e) => updateTab(tab.id, { minAge: parseAgeInput(e.target.value) })}
                className="border rounded px-3 py-2 text-sm md:col-span-2"
                placeholder="Min age"
              />
              <input
                type="number"
                min={0}
                value={tab.maxAge}
                onChange={(e) => updateTab(tab.id, { maxAge: parseAgeInput(e.target.value) })}
                className="border rounded px-3 py-2 text-sm md:col-span-2"
                placeholder="Max age"
              />
              <button
                type="button"
                onClick={() => removeTab(tab.id)}
                disabled={ageTabs.length <= 1}
                className="md:col-span-2 text-sm px-3 py-2 rounded border text-red-600 border-red-200 hover:bg-red-50 disabled:text-gray-300 disabled:border-gray-200 disabled:hover:bg-transparent"
              >
                Remove
              </button>
            </div>
          ))}
        </div>

        <p className="text-xs text-gray-500 mt-3">
          Ranges are inclusive. If tabs overlap, attendees will appear in each matching tab.
        </p>
      </div>

      <div className="bg-white border rounded-lg p-5">
        <div className="flex flex-wrap gap-2 mb-4">
          {tabsWithAttendees.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTabId(tab.id)}
              className={`px-3 py-1.5 rounded text-sm border ${
                tab.id === activeTabId
                  ? 'bg-sky-600 text-white border-sky-600'
                  : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
              }`}
            >
              {(tab.label || 'Untitled').trim()} ({tab.attendees.length})
            </button>
          ))}
        </div>

        {activeTab && activeTab.attendees.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b text-xs uppercase">
                  <th className="pb-2">Attendee</th>
                  <th className="pb-2">Age</th>
                  <th className="pb-2">DOB</th>
                  <th className="pb-2">Ticket</th>
                  <th className="pb-2">Booker</th>
                  <th className="pb-2">Order</th>
                </tr>
              </thead>
              <tbody>
                {activeTab.attendees.map((attendee, index) => (
                  <tr key={`${activeTab.id}-${attendee.order_id}-${index}`} className="border-b">
                    <td className="py-2 font-medium text-gray-900">{attendee.attendee_name}</td>
                    <td className="py-2">{attendee.attendee_age}</td>
                    <td className="py-2 text-gray-500">{formatDate(attendee.attendee_dob)}</td>
                    <td className="py-2 text-gray-500">
                      {attendee.ticket_type_name ?? 'Unknown ticket'}
                      {attendee.price_band_label ? ` (${attendee.price_band_label})` : ''}
                    </td>
                    <td className="py-2">
                      <div className="text-gray-900">{attendee.booker_name}</div>
                      <div className="text-xs text-gray-500">{attendee.booker_email}</div>
                    </td>
                    <td className="py-2">
                      <div className="flex items-center gap-2">
                        <Link
                          to={`/admin/orders/${attendee.order_id}`}
                          className="text-sky-600 hover:underline text-xs font-mono"
                        >
                          {attendee.order_number}
                        </Link>
                        <StatusBadge status={attendee.order_status} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-gray-500 text-sm">No attendees in this age tab.</p>
        )}

        {outsideDefinedRanges.length > 0 && (
          <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-3 py-2 mt-4">
            {outsideDefinedRanges.length} attendee(s) are outside all currently defined tabs.
          </p>
        )}
      </div>
    </div>
  );
}
