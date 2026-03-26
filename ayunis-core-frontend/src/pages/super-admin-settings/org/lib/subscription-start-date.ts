import { z } from 'zod';

export function buildSubscriptionStartDateSchema(t: (key: string) => string) {
  return z.object({
    startsAt: z.string().min(1, t('subscription.validation.startsAt.required')),
  });
}

export function toCalendarDateKey(value: string): string {
  return new Date(value).toISOString().slice(0, 10);
}

/**
 * Converts a UTC midnight ISO string into a local Date whose
 * year/month/day match the UTC components, so that calendar widgets
 * and toLocaleDateString() display the intended date regardless of
 * the user's local timezone.
 */
export function utcDateToLocal(value: string): Date {
  const d = new Date(value);
  return new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
}
