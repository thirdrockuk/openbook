import { useQuery } from '@tanstack/react-query';
import { apiClient } from './client';
import type { Order, BookingView } from '../types';

export function useOrder(id: string | undefined) {
  return useQuery<Order>({
    queryKey: ['orders', id],
    queryFn: async () => {
      const res = await apiClient.get<Order>(`/api/orders/${id}`);
      return res.data;
    },
    enabled: Boolean(id),
  });
}

export async function createOrder(data: {
  event_id: string;
  booker_name: string;
  booker_email: string;
  booker_phone?: string;
  attendees: {
    ticket_type_id: string;
    attendee_name: string;
    attendee_dob: string;
    is_student?: boolean;
    dietary_requirements?: string;
    access_requirements?: string;
  }[];
}): Promise<Order> {
  const res = await apiClient.post<Order>('/api/orders', data);
  return res.data;
}

export async function confirmOrder(orderId: string): Promise<Order> {
  const res = await apiClient.post<Order>(`/api/orders/${orderId}/confirm`);
  return res.data;
}

export function useBookingView(token: string | undefined) {
  return useQuery<BookingView>({
    queryKey: ['booking', token],
    queryFn: async () => {
      const res = await apiClient.get<BookingView>(`/api/orders/view/${token}`);
      return res.data;
    },
    enabled: Boolean(token),
  });
}

export async function cancelOrder(orderId: string): Promise<Order> {
  const res = await apiClient.post<Order>(`/api/orders/${orderId}/cancel`);
  return res.data;
}
