import { formatDistanceToNow } from 'date-fns';
import { de, enUS } from 'date-fns/locale';

/**
 * Format a date string as a human-readable relative time (e.g., "3 days ago").
 * Selects locale based on the provided language code.
 */
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
