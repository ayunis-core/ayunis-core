/** Formats with the given locale, or the browser's when omitted. */
export function formatDate(date: string, locale?: string) {
  return new Date(date).toLocaleDateString(locale, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}
