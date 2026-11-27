import { registerAs } from '@nestjs/config';

export const adventCalendarConfig = registerAs('adventCalendar', () => ({
  // Only set for the e2e tests, which need open doors outside December: the
  // advent calendar's clock starts at this instant when the backend boots.
  now: process.env.ADVENT_CALENDAR_NOW?.trim() || null,
}));
