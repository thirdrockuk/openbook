import { useQuery } from '@tanstack/react-query';
import { apiClient } from './client';
import type { Event } from '../types';

export function useEvents() {
  return useQuery<Event[]>({
    queryKey: ['events'],
    queryFn: async () => {
      const res = await apiClient.get<Event[]>('/api/events');
      return res.data;
    },
  });
}

export function useEvent(id: string | undefined) {
  return useQuery<Event>({
    queryKey: ['events', id],
    queryFn: async () => {
      const res = await apiClient.get<Event>(`/api/events/${id}`);
      return res.data;
    },
    enabled: Boolean(id),
  });
}
