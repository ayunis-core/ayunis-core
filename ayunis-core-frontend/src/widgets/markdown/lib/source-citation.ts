const UUID_PATTERN =
  '[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}';
const LABEL_PATTERN = '[^|{}\\r\\n]{1,200}';
const SEPARATOR_PATTERN = String.raw`\\?\|`;
const markerPattern = (separator: string) =>
  `\\{\\{source:(${UUID_PATTERN})(?:${separator})(${LABEL_PATTERN})\\}\\}`;
const MARKER_PATTERN = markerPattern(SEPARATOR_PATTERN);
const FULL_MARKER_REGEX = new RegExp(`^${MARKER_PATTERN}$`);

export interface SourceCitation {
  chunkId: string;
  label: string;
}

interface SourceCitationMatch {
  citation: SourceCitation;
  start: number;
  end: number;
}

export type SourceCitationTextPart =
  | { kind: 'text'; text: string }
  | { kind: 'citation'; citation: SourceCitation };

export function parseSourceCitationMarker(
  marker: string,
): SourceCitation | null {
  const match = FULL_MARKER_REGEX.exec(marker);
  if (!match) return null;

  return { chunkId: match[1], label: match[2] };
}

export function findSourceCitationMarkers(
  text: string,
  protectedSeparator?: string,
): SourceCitationMatch[] {
  const separator = protectedSeparator
    ? `${SEPARATOR_PATTERN}|${protectedSeparator}`
    : SEPARATOR_PATTERN;
  const regex = new RegExp(`(?<!\\{)${markerPattern(separator)}(?!\\})`, 'g');
  return [...text.matchAll(regex)].map((match) => ({
    citation: { chunkId: match[1], label: match[2] },
    start: match.index,
    end: match.index + match[0].length,
  }));
}

export function findSourceCitationPipeOffsets(text: string): number[] {
  const regex = new RegExp(`(?<!\\{)\\{\\{source:${UUID_PATTERN}\\|`, 'g');
  return [...text.matchAll(regex)].map(
    (match) => match.index + match[0].length - 1,
  );
}

export function splitSourceCitationMarkers(
  text: string,
): SourceCitationTextPart[] {
  const matches = findSourceCitationMarkers(text);
  if (matches.length === 0) return [{ kind: 'text', text }];

  const parts: SourceCitationTextPart[] = [];
  let lastIndex = 0;
  for (const match of matches) {
    if (match.start > lastIndex) {
      parts.push({ kind: 'text', text: text.slice(lastIndex, match.start) });
    }
    parts.push({ kind: 'citation', citation: match.citation });
    lastIndex = match.end;
  }
  if (lastIndex < text.length) {
    parts.push({ kind: 'text', text: text.slice(lastIndex) });
  }
  return parts;
}
