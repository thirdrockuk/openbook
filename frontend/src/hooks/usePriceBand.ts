import { useMemo } from 'react';
import type { PriceBand, TicketType } from '../types';
import { ageAtEvent } from '../utils/age';

export function usePriceBand(
  ticketType: TicketType | null,
  dob: Date | null,
  eventStart: Date | null
): PriceBand | null {
  return useMemo(() => {
    if (!ticketType || !dob || !eventStart) return null;
    const age = ageAtEvent(dob, eventStart);
    return (
      ticketType.price_bands.find(
        (b) => age >= b.age_min && age <= b.age_max
      ) ?? null
    );
  }, [ticketType, dob, eventStart]);
}
