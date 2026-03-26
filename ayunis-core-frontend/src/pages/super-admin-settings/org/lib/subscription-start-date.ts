import { z } from 'zod';

export function buildSubscriptionStartDateSchema(t: (key: string) => string) {
  return z.object({
    startsAt: z.string().min(1, t('subscription.validation.startsAt.required')),
  });
}

export function toCalendarDateKey(value: string): string {
  return new Date(value).toISOString().slice(0, 10);
}
