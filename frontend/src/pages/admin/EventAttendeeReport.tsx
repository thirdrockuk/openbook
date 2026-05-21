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
    return <div role="status" className="text-gray-500">Loading…</div>;
  }

  if (!report) {
    return <div className="text-red-500">Event report not found.</div>;
  }

  return (
    <div>
      <div className="mb-6">
        <Link
          to={`/admin/events/${eventId}`}
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 mb-2 transition-colors"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
          </svg>
          Back to event
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">{report.event_title}</h1>
        <div className="flex items-center gap-2 mt-1">
          <p className="text-sm text-gray-500">Attendee report</p>
          <span className="text-xs font-medium bg-sky-100 text-sky-700 px-1.5 py-0.5 rounded-full">{report.attendees.length}</span>
        </div>
      </div>

      <div className="bg-white border border-gray-100 rounded-xl shadow-sm p-5 mb-4">
        <div className="flex items-center justify-between gap-4 flex-wrap mb-3">
          <h2 className="font-semibold text-gray-800">Report scope</h2>
          <label className="inline-flex items-center gap-2 text-sm text-gray-700 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={includePending}
              onChange={(e) => setIncludePending(e.target.checked)}
              className="h-4 w-4 rounded"
            />
            Include pending orders
          </label>
        </div>
        <p className="text-sm text-gray-500">
          Showing {attendees.length} attendees from
          {includePending ? ' confirmed and pending orders.' : ' confirmed orders only.'}
        </p>
      </div>

      <div className="bg-white border border-gray-100 rounded-xl shadow-sm p-5 mb-4">
        <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
          <h2 className="font-semibold text-gray-800">Age tabs</h2>
          <div className="flex items-center gap-2">
            {isDirty && (
              <span className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-2.5 py-1">
                Unsaved changes
              </span>
            )}
            <button
              type="button"
              onClick={addTab}
              className="flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-lg bg-sky-600 text-white hover:bg-sky-700 transition-colors"
            >
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              Add tab
            </button>
            <button
              type="button"
              onClick={handleSaveTabs}
              disabled={!isDirty || isSaving}
              className="text-sm px-3 py-1.5 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 disabled:text-gray-400 disabled:border-gray-100 transition-colors"
            >
              {isSaving ? 'Saving…' : 'Save tabs'}
            </button>
          </div>
        </div>

        {saveError && <p role="alert" className="text-xs text-red-600 mb-3">{saveError}</p>}
        {saveFeedback && <p className="text-xs text-green-700 mb-3">{saveFeedback}</p>}

        <div className="space-y-2.5">
          {ageTabs.map((tab) => (
            <div key={tab.id} className="grid grid-cols-1 md:grid-cols-12 gap-2">
              <input
                type="text"
                value={tab.label}
                onChange={(e) => updateTab(tab.id, { label: e.target.value })}
                className="border border-gray-200 rounded-lg px-3 py-2 text-sm md:col-span-6 focus:outline-none focus:ring-2 focus:ring-sky-500"
                placeholder="Tab label"
              />
              <input
                type="number"
                min={0}
                value={tab.minAge}
                onChange={(e) => updateTab(tab.id, { minAge: parseAgeInput(e.target.value) })}
                className="border border-gray-200 rounded-lg px-3 py-2 text-sm md:col-span-2 focus:outline-none focus:ring-2 focus:ring-sky-500"
                placeholder="Min age"
              />
              <input
                type="number"
                min={0}
                value={tab.maxAge}
                onChange={(e) => updateTab(tab.id, { maxAge: parseAgeInput(e.target.value) })}
                className="border border-gray-200 rounded-lg px-3 py-2 text-sm md:col-span-2 focus:outline-none focus:ring-2 focus:ring-sky-500"
                placeholder="Max age"
              />
              <button
                type="button"
                onClick={() => removeTab(tab.id)}
                disabled={ageTabs.length <= 1}
                className="md:col-span-2 text-sm px-3 py-2 rounded-lg border border-red-200 text-red-600 bg-white hover:bg-red-50 disabled:text-gray-300 disabled:border-gray-100 transition-colors"
              >
                Remove
              </button>
            </div>
          ))}
        </div>

        <p className="text-xs text-gray-400 mt-3">
          Ranges are inclusive. If tabs overlap, attendees will appear in each matching tab.
        </p>
      </div>

      <div className="bg-white border border-gray-100 rounded-xl shadow-sm p-5">
        <div className="flex flex-wrap gap-2 mb-5">
          {tabsWithAttendees.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTabId(tab.id)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                tab.id === activeTabId
                  ? 'bg-sky-600 text-white shadow-sm'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {(tab.label || 'Untitled').trim()}
              <span className={`text-xs px-1.5 py-0.5 rounded-full ${tab.id === activeTabId ? 'bg-sky-500 text-white' : 'bg-white text-gray-500'}`}>
                {tab.attendees.length}
              </span>
            </button>
          ))}
        </div>

        {activeTab && activeTab.attendees.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="pb-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Attendee</th>
                  <th className="pb-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Age</th>
                  <th className="pb-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">DOB</th>
                  <th className="pb-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Ticket</th>
                  <th className="pb-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Booker</th>
                  <th className="pb-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Order</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {activeTab.attendees.map((attendee, index) => (
                  <tr key={`${activeTab.id}-${attendee.order_id}-${index}`} className="hover:bg-gray-50 transition-colors">
                    <td className="py-3 font-medium text-gray-900">{attendee.attendee_name}</td>
                    <td className="py-3 text-gray-700">{attendee.attendee_age}</td>
                    <td className="py-3 text-gray-500">{formatDate(attendee.attendee_dob)}</td>
                    <td className="py-3 text-gray-500">
                      {attendee.ticket_type_name ?? 'Unknown ticket'}
                      {attendee.price_band_label ? ` (${attendee.price_band_label})` : ''}
                    </td>
                    <td className="py-3">
                      <div className="text-gray-900">{attendee.booker_name}</div>
                      <div className="text-xs text-gray-500">{attendee.booker_email}</div>
                    </td>
                    <td className="py-3">
                      <div className="flex items-center gap-2 flex-wrap">
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
          <div className="text-center py-8">
            <p className="text-gray-400 text-sm">No attendees in this age tab.</p>
          </div>
        )}

        {outsideDefinedRanges.length > 0 && (
          <div className="flex items-center gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2.5 mt-4">
            <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
            </svg>
            {outsideDefinedRanges.length} attendee{outsideDefinedRanges.length !== 1 ? 's are' : ' is'} outside all currently defined tabs.
          </div>
        )}
      </div>
    </div>
  );
}
