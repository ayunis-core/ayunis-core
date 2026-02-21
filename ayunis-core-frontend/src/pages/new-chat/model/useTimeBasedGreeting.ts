import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { type Greeting, greetings } from './greetings-data';

function getTimePeriod(hour: number): keyof typeof greetings {
  if (hour >= 6 && hour < 8) return 'earlyMorning';
  if (hour >= 8 && hour < 10) return 'morningStart';
  if (hour >= 10 && hour < 12) return 'lateMorning';
  if (hour >= 12 && hour < 13) return 'lunchBreak';
  if (hour >= 13 && hour < 15) return 'earlyAfternoon';
  if (hour >= 15 && hour < 17) return 'lateAfternoon';
  if (hour >= 17 && hour < 21) return 'evening';
  // 21-6 is night (including 0-5)
  return 'night';
}

function getRandomGreeting(period: keyof typeof greetings): Greeting {
  const periodGreetings = greetings[period];
  // eslint-disable-next-line sonarjs/pseudo-random -- Random greeting selection for UI variety, not security-sensitive
  const randomIndex = Math.floor(Math.random() * periodGreetings.length);
  return periodGreetings[randomIndex];
}

/**
 * Returns a time-based greeting with German bureaucratic humor.
 * The greeting changes based on the current time of day and is randomly
 * selected from a list of greetings for that time period.
 *
 * The greeting is returned in the user's current language (German or English).
 *
 * The greeting is memoized and only recalculated when the component mounts
 * (not on every render), so it stays consistent during the session.
 */
export function useTimeBasedGreeting(): string {
  const { i18n } = useTranslation();

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    const period = getTimePeriod(hour);
    return getRandomGreeting(period);
  }, []);

  // Return greeting in user's language (default to German if not English)
  return i18n.language === 'en' ? greeting.en : greeting.de;
}
