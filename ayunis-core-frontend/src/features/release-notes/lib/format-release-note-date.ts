/** A release note's `YYYY-MM-DD` date as "5. November 2026" / "November 5, 2026". */
export function formatReleaseNoteDate(date: string, language: string): string {
  // A date without a time is UTC midnight; formatting it in UTC keeps the day.
  return new Date(date).toLocaleDateString(language, {
    dateStyle: 'long',
    timeZone: 'UTC',
  });
}
