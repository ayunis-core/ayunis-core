const STATE_CODES = 'BW|BY|BE|BB|HB|HH|HE|MV|NI|NW|RP|SL|SN|ST|SH|TH';
const SCOPE_PATTERN = `DE(?:-(?:${STATE_CODES}))?`;
const CODE_PATTERN = '[A-Za-z0-9_-]+';
const NUMBER_PATTERN = '[1-9]\\d*[a-z]?';
const MARKER_PATTERN = `\\{\\{legal:(${SCOPE_PATTERN})/(${CODE_PATTERN})/(sec|art)_(${NUMBER_PATTERN})(?:/par_(${NUMBER_PATTERN}))?\\}\\}`;
const FULL_MARKER_REGEX = new RegExp(`^${MARKER_PATTERN}$`);
const MARKER_REGEX = new RegExp(`(?<!\\{)${MARKER_PATTERN}(?!\\})`, 'g');

export interface LegalReference {
  href: string;
  label: string;
}

export type LegalTextPart =
  | { kind: 'text'; text: string }
  | { kind: 'reference'; reference: LegalReference };

export function parseLegalMarker(marker: string): LegalReference | null {
  const match = FULL_MARKER_REGEX.exec(marker);
  if (!match) return null;

  const [, scope, code, locator, provision, paragraph] = match;
  const state = scope === 'DE' ? null : scope.slice(3);
  const origin = state
    ? `https://landesrecht.online/${state}`
    : 'https://bundesrecht.online';
  const path = `${origin}/${encodeURIComponent(code)}/${encodeURIComponent(provision)}`;
  const href = paragraph ? `${path}#Abs${encodeURIComponent(paragraph)}` : path;
  const prefix = locator === 'sec' ? '§' : 'Art.';
  const paragraphLabel = paragraph ? ` Abs. ${paragraph}` : '';

  return {
    href,
    label: `${prefix} ${provision}${paragraphLabel} ${code}`,
  };
}

export function splitLegalMarkers(text: string): LegalTextPart[] {
  const parts: LegalTextPart[] = [];
  let lastIndex = 0;

  for (const match of text.matchAll(MARKER_REGEX)) {
    const reference = parseLegalMarker(match[0]);
    if (!reference) continue;
    if (match.index > lastIndex) {
      parts.push({ kind: 'text', text: text.slice(lastIndex, match.index) });
    }
    parts.push({ kind: 'reference', reference });
    lastIndex = match.index + match[0].length;
  }

  if (parts.length === 0) return [{ kind: 'text', text }];
  if (lastIndex < text.length) {
    parts.push({ kind: 'text', text: text.slice(lastIndex) });
  }
  return parts;
}
