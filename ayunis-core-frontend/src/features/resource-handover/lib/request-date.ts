import { differenceInSeconds, format, isToday, isYesterday } from 'date-fns';
import { de, enUS } from 'date-fns/locale';
import type { CopyKey } from '@/features/resource-handover/model/types';

const JUST_NOW_SECONDS = 60;

export function requestDateCopy(
  requestedAt: string,
  language: string,
  now: Date = new Date(),
): CopyKey {
  const date = new Date(requestedAt);
  if (differenceInSeconds(now, date) < JUST_NOW_SECONDS) {
    return { key: 'date.justNow' };
  }
  const time = format(date, 'HH:mm');
  if (isToday(date)) return { key: 'date.today', values: { time } };
  if (isYesterday(date)) return { key: 'date.yesterday', values: { time } };
  return {
    key: 'date.plain',
    values: {
      date: format(date, 'P', { locale: language === 'de' ? de : enUS }),
    },
  };
}
