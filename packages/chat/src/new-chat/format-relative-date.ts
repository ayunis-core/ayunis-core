import { formatDistanceToNow } from 'date-fns';
import { de, enUS } from 'date-fns/locale';

/** A date as a time relative to now, e.g. "3 days ago", in the given language. */
export function formatRelativeDate(
  dateString: string,
  language: string,
): string {
  try {
    return formatDistanceToNow(new Date(dateString), {
      addSuffix: true,
      locale: language === 'de' ? de : enUS,
    });
  } catch {
    return '—';
  }
}
