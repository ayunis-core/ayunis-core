import { ROUTINE_TIME_ZONE } from './routines.constants';

const BERLIN_DATE = new Intl.DateTimeFormat('de-DE', {
  timeZone: ROUTINE_TIME_ZONE,
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
});

/** A routine thread's title: "<routine name> – <date>", never generated. */
export function routineThreadTitle(routineName: string, at: Date): string {
  return `${routineName} – ${BERLIN_DATE.format(at)}`;
}
