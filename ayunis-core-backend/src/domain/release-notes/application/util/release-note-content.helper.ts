import {
  NOTIFICATION_BODY_MAX_LENGTH,
  NOTIFICATION_HEADLINE_MAX_LENGTH,
} from 'src/domain/notifications/domain/notifications.constants';
import type { AnnouncableReleaseNote } from 'src/domain/release-notes/application/models/announcable-release-note';
import { RELEASE_NOTE_DEFAULT_LINK_LABEL } from 'src/domain/release-notes/domain/release-notes.constants';

export type ReleaseNoteText =
  | { readonly headline: string; readonly body: string }
  | { readonly violation: string };

/** The headline and markdown body of a note, within the notification limits. */
export function releaseNoteText(note: AnnouncableReleaseNote): ReleaseNoteText {
  const headline = note.title.trim();
  const body = [note.text.trim(), linkMarkdown(note)]
    .filter((part) => part.length > 0)
    .join('\n\n');
  if (headline.length === 0) return { violation: 'the title is empty' };
  if (headline.length > NOTIFICATION_HEADLINE_MAX_LENGTH) {
    return {
      violation: `the title is longer than ${NOTIFICATION_HEADLINE_MAX_LENGTH} characters`,
    };
  }
  if (body.length === 0) return { violation: 'the note has no text' };
  if (body.length > NOTIFICATION_BODY_MAX_LENGTH) {
    return {
      violation: `the text is longer than ${NOTIFICATION_BODY_MAX_LENGTH} characters`,
    };
  }
  return { headline, body };
}

/** The note's date as `YYYY-MM-DD`, or null when Announcable sends none. */
export function publishedOn(note: AnnouncableReleaseNote): string | null {
  const match = /^(\d{2})\.(\d{2})\.(\d{4})$/.exec(note.date.trim());
  if (!match) return null;
  const [day, month, year] = match.slice(1).map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  // Date rolls 31.02. over into March instead of rejecting it.
  if (date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) {
    return null;
  }
  return date.toISOString().slice(0, 10);
}

/** The image URL without its query, which carries the expiring signature. */
export function imageSourcePath(imageSrc: string): string | null {
  const url = parseUrl(imageSrc);
  if (!url) return null;
  url.search = '';
  url.hash = '';
  return url.href;
}

function linkMarkdown(note: AnnouncableReleaseNote): string {
  const url = parseUrl(note.ctaHrefOverride.trim());
  if (url?.protocol !== 'https:' && url?.protocol !== 'http:') return '';
  const label = note.ctaLabelOverride.trim() || RELEASE_NOTE_DEFAULT_LINK_LABEL;
  const href = url.href.replaceAll('(', '%28').replaceAll(')', '%29');
  return `[${label.replace(/[[\]]/g, '\\$&')}](${href})`;
}

function parseUrl(value: string): URL | null {
  return URL.canParse(value) ? new URL(value) : null;
}
