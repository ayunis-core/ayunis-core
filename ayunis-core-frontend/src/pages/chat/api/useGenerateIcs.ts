// Utils
import { showError } from '@/shared/lib/toast';
import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';

export type CalendarEventInput = {
  title: string;
  start: string; // ISO 8601
  end: string; // ISO 8601
  description?: string;
  location?: string;
};

function formatDateUTC(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  const yyyy = date.getUTCFullYear();
  const mm = pad(date.getUTCMonth() + 1);
  const dd = pad(date.getUTCDate());
  const hh = pad(date.getUTCHours());
  const mi = pad(date.getUTCMinutes());
  const ss = pad(date.getUTCSeconds());

  return `${yyyy}${mm}${dd}T${hh}${mi}${ss}Z`;
}

function escapeIcsText(input: string): string {
  return input
    .replace(/\\/g, '\\\\')
    .replace(/\n/g, '\\n')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,');
}

function foldLine(line: string): string[] {
  const encoder = new TextEncoder();
  let currentBytes = 0;
  let currentChunk = '';
  const chunks: string[] = [];

  for (const char of line) {
    const charBytes = encoder.encode(char).length;

    if (currentBytes + charBytes > 75) {
      chunks.push(currentChunk);
      currentChunk = char;
      currentBytes = charBytes;
    } else {
      currentChunk += char;
      currentBytes += charBytes;
    }
  }

  if (currentChunk.length > 0) {
    chunks.push(currentChunk);
  }

  return chunks.map((c, idx) => (idx === 0 ? c : ` ${c}`));
}

function validate(input: CalendarEventInput): void {
  if (!input.title || !input.start || !input.end) {
    throw new Error('Missing required fields for ICS generation');
  }

  const startDate = new Date(input.start);
  const endDate = new Date(input.end);
  if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
    throw new Error('Invalid date format for start or end');
  }

  if (endDate <= startDate) {
    throw new Error('End time must be after start time');
  }
}

export function useGenerateIcs() {
  const { t } = useTranslation('chats');

  const generate = useCallback(
    (data: CalendarEventInput): string => {
      try {
        validate(data);
        const startDate = new Date(data.start);
        const endDate = new Date(data.end);

        const uid = `${Date.now()}-${Math.random().toString(36).slice(2)}@ayunis`;
        const dtStamp = formatDateUTC(new Date());
        const dtStart = formatDateUTC(startDate);
        const dtEnd = formatDateUTC(endDate);

        const rawLines = [
          'BEGIN:VCALENDAR',
          'VERSION:2.0',
          'PRODID:-//ayunis//core//EN',
          'CALSCALE:GREGORIAN',
          'METHOD:PUBLISH',
          'BEGIN:VEVENT',
          `UID:${uid}`,
          `DTSTAMP:${dtStamp}`,
          `DTSTART:${dtStart}`,
          `DTEND:${dtEnd}`,
          `SUMMARY:${escapeIcsText(data.title)}`,
          `DESCRIPTION:${escapeIcsText(data.description || '')}`,
          `LOCATION:${escapeIcsText(data.location || '')}`,
          'END:VEVENT',
          'END:VCALENDAR',
          '',
        ];

        const foldedLines = rawLines.flatMap((line) => foldLine(line));
        return foldedLines.join('\r\n');
      } catch (err) {
        showError(t('chat.errorUnexpected'));
        throw err instanceof Error ? err : new Error(String(err));
      }
    },
    [t],
  );

  return { generate };
}
