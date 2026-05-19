import { useQuery } from '@tanstack/react-query';
import { apiClient } from './client';
import type {
  Event,
  Order,
  DashboardStats,
  TicketType,
  AdminUser,
  PaginatedOrders,
  EventAttendeeReportAgeTab,
  EventAttendeeReport,
  EventAttendeeReportSettings,
} from '../types';

export function useAdminEvents() {
  return useQuery<Event[]>({
    queryKey: ['admin', 'events'],
    queryFn: async () => {
      const res = await apiClient.get<Event[]>('/api/admin/events');
      return res.data;
    },
  });
}

export function useAdminEvent(id: string | undefined) {
  return useQuery<Event>({
    queryKey: ['admin', 'events', id],
    queryFn: async () => {
      const res = await apiClient.get<Event>(`/api/admin/events/${id}`);
      return res.data;
    },
    enabled: Boolean(id),
  });
}

export type OrderSortCol = 'created_at' | 'order_number' | 'booker_name' | 'total_pence' | 'status';

export function useAdminOrdersPage(
  eventId: string,
  page: number,
  pageSize: number,
  sortDirection: 'desc' | 'asc' = 'desc',
  sortCol: OrderSortCol = 'created_at',
  search = '',
  includeCancelled = false
) {
  return useQuery<PaginatedOrders>({
    queryKey: ['admin', 'events', eventId, 'orders', 'paged', page, pageSize, sortDirection, sortCol, search, includeCancelled],
    queryFn: async () => {
      const res = await apiClient.get<PaginatedOrders>(`/api/admin/events/${eventId}/orders/paginated`, {
        params: {
          page,
          page_size: pageSize,
          sort_dir: sortDirection,
          sort_col: sortCol,
          ...(search ? { search } : {}),
          ...(includeCancelled ? { include_cancelled: true } : {}),
        },
      });
      return res.data;
    },
    enabled: Boolean(eventId),
  });
}

export function useAdminEventAttendeeReport(
  eventId: string | undefined,
  includePending = false
) {
  return useQuery<EventAttendeeReport>({
    queryKey: ['admin', 'events', eventId, 'attendee-report', includePending],
    queryFn: async () => {
      const res = await apiClient.get<EventAttendeeReport>(
        `/api/admin/events/${eventId}/attendee-report`,
        {
          params: { include_pending: includePending },
        }
      );
      return res.data;
    },
    enabled: Boolean(eventId),
  });
}

export async function updateAdminEventAttendeeReportSettings(
  eventId: string,
  ageTabs: EventAttendeeReportAgeTab[]
): Promise<EventAttendeeReportSettings> {
  const res = await apiClient.put<EventAttendeeReportSettings>(
    `/api/admin/events/${eventId}/attendee-report/settings`,
    {
      age_tabs: ageTabs,
    }
  );
  return res.data;
}

export function useAdminOrder(id: string | undefined) {
  return useQuery<Order>({
    queryKey: ['admin', 'orders', id],
    queryFn: async () => {
      const res = await apiClient.get<Order>(`/api/admin/orders/${id}`);
      return res.data;
    },
    enabled: Boolean(id),
  });
}

export function useDashboard() {
  return useQuery<DashboardStats>({
    queryKey: ['admin', 'dashboard'],
    queryFn: async () => {
      const res = await apiClient.get<DashboardStats>('/api/admin/dashboard');
      return res.data;
    },
  });
}

export function useAdminTicketTypes(eventId: string | undefined) {
  return useQuery<TicketType[]>({
    queryKey: ['admin', 'events', eventId, 'ticket-types'],
    queryFn: async () => {
      const res = await apiClient.get<TicketType[]>(`/api/admin/events/${eventId}/ticket-types`);
      return res.data;
    },
    enabled: Boolean(eventId),
  });
}

export function useAdminUsers() {
  return useQuery<AdminUser[]>({
    queryKey: ['admin', 'users'],
    queryFn: async () => {
      const res = await apiClient.get<AdminUser[]>('/api/admin/users');
      return res.data;
    },
  });
}

export function useAdminUser(id: string | undefined) {
  return useQuery<AdminUser>({
    queryKey: ['admin', 'users', id],
    queryFn: async () => {
      const res = await apiClient.get<AdminUser>(`/api/admin/users/${id}`);
      return res.data;
    },
    enabled: Boolean(id),
  });
}

export function useCurrentAdminUser() {
  return useQuery<AdminUser>({
    queryKey: ['admin', 'me'],
    queryFn: async () => {
      const res = await apiClient.get<AdminUser>('/api/auth/me');
      return res.data;
    },
  });
}

export async function recordPayment(
  orderId: string,
  data: { amount_pence: number; method: string; reference?: string; note?: string; received_at?: string }
): Promise<Order> {
  const res = await apiClient.post<Order>(`/api/admin/orders/${orderId}/payments`, data);
  return res.data;
}

export async function deletePayment(orderId: string, paymentId: string): Promise<void> {
  await apiClient.delete(`/api/admin/orders/${orderId}/payments/${paymentId}`);
}

export async function updateOrderItemPrice(
  orderId: string,
  itemId: string,
  pricePence: number
): Promise<Order> {
  const res = await apiClient.put<Order>(`/api/admin/orders/${orderId}/items/${itemId}/price`, {
    price_pence: pricePence,
  });
  return res.data;
}

export async function resetOrderItemPrice(orderId: string, itemId: string): Promise<Order> {
  const res = await apiClient.post<Order>(`/api/admin/orders/${orderId}/items/${itemId}/price/reset`);
  return res.data;
}

export async function updateOrderItemRequirements(
  orderId: string,
  itemId: string,
  data: { dietary_requirements: string | null; access_requirements: string | null }
): Promise<Order> {
  const res = await apiClient.put<Order>(
    `/api/admin/orders/${orderId}/items/${itemId}/requirements`,
    data
  );
  return res.data;
}

export async function cancelAdminOrder(orderId: string): Promise<Order> {
  const res = await apiClient.post<Order>(`/api/admin/orders/${orderId}/cancel`);
  return res.data;
}
