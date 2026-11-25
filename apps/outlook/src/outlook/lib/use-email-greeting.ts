import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  emailGreetings,
  type GreetingSet,
} from '@/outlook/model/email-greetings';

const periods: readonly [number, keyof GreetingSet][] = [
  [6, 'night'],
  [8, 'earlyMorning'],
  [10, 'morningStart'],
  [12, 'lateMorning'],
  [13, 'lunchBreak'],
  [15, 'earlyAfternoon'],
  [17, 'lateAfternoon'],
  [21, 'evening'],
  [24, 'night'],
];

export function useEmailGreeting() {
  const { i18n } = useTranslation();
  const [greeting] = useState(() => {
    const hour = new Date().getHours();
    const period = periods.find(([end]) => hour < end)?.[1] ?? 'night';
    const options = emailGreetings[period];
    // eslint-disable-next-line sonarjs/pseudo-random -- Random greeting selection for UI variety, not security-sensitive
    return options[Math.floor(Math.random() * options.length)];
  });
  return i18n.language === 'en' ? greeting.en : greeting.de;
}
