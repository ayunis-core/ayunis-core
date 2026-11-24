import { createInstance } from 'i18next';
import { describe, expect, it } from 'vitest';
import de from '@/shared/locales/de/routines.json';
import en from '@/shared/locales/en/routines.json';
import type { RoutineSchedule } from '@/features/routines/model/openapi';
import { describeRoutineSchedule } from './routine-schedule';

async function describeIn(language: 'de' | 'en', schedule: RoutineSchedule) {
  const i18n = createInstance();
  await i18n.init({
    lng: language,
    resources: { de: { routines: de }, en: { routines: en } },
  });
  return describeRoutineSchedule(
    schedule,
    i18n.getFixedT(language, 'routines'),
  );
}

describe('describeRoutineSchedule', () => {
  it.each<[RoutineSchedule, string, string]>([
    [
      { frequency: 'daily', time: '07:00' },
      'Täglich um 07:00',
      'Daily at 07:00',
    ],
    [
      { frequency: 'weekly', time: '07:00', weekdays: [1, 4] },
      'Mo, Do um 07:00',
      'Mon, Thu at 07:00',
    ],
    [
      { frequency: 'monthly', time: '07:00', monthDay: 15 },
      'Monatlich am 15. um 07:00',
      'Monthly on day 15 at 07:00',
    ],
    [
      { frequency: 'monthly', time: '07:00', monthDay: 'last' },
      'Monatlich am letzten Tag um 07:00',
      'Monthly on the last day at 07:00',
    ],
  ])(
    'describes %o for the card and status line',
    async (schedule, german, english) => {
      expect(await describeIn('de', schedule)).toBe(german);
      expect(await describeIn('en', schedule)).toBe(english);
    },
  );
});
