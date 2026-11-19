import type { PiiDetection } from './pii-detection';
import { PiiCategory } from './pii-category.enum';
import { findPiiTokenRanges } from './deanonymize-text';

type Range = Pick<PiiDetection, 'start' | 'end'>;

/**
 * Categories whose spans come from a language model and routinely swallow
 * neighbouring tokens. Every other category (email, phone, URL, financial
 * account, government ID, date) has token-exact boundaries and keeps its whole
 * range when the two kinds overlap. OTHER is unmapped engine output of unknown
 * precision, so it is treated as name-like.
 */
const NAME_LIKE_CATEGORIES = new Set<PiiCategory>([
  PiiCategory.PERSON_NAME,
  PiiCategory.ORGANIZATION,
  PiiCategory.LOCATION,
  PiiCategory.NATIONALITY_RELIGION_POLITICS,
  PiiCategory.OTHER,
]);

/**
 * Turns the overlapping detections an engine returns into disjoint ones.
 * Within a class the outermost detection wins and one crossing it keeps its
 * remainder, so nothing the engine covered is left unmasked. A name-like
 * detection is then carved around every structured detection it touches and
 * trimmed to its words, so an email keeps its exact range and a name next to
 * it does not absorb it. Disjoint detections are what mask replacement and
 * de-anonymisation rely on. Placeholders already in the text are carved out
 * of every detection last: they stand for a masked value, and re-masking one
 * would nest tokens.
 */
export function resolveDetectionOverlaps(
  detections: readonly PiiDetection[],
  text: string,
): PiiDetection[] {
  const structured = collapse(
    detections.filter((d) => !NAME_LIKE_CATEGORIES.has(d.category)),
    text,
  );
  const nameLike = collapse(
    detections.filter((d) => NAME_LIKE_CATEGORIES.has(d.category)),
    text,
  );
  const carved = nameLike
    .flatMap((d) => carve(d, structured, text))
    .map((d) => trimWhitespace(d, text))
    .filter((d) => d.start < d.end);
  return excludePiiTokens([...structured, ...carved], text).sort(
    (a, b) => a.start - b.start,
  );
}

function excludePiiTokens(
  detections: PiiDetection[],
  text: string,
): PiiDetection[] {
  const tokens = findPiiTokenRanges(text);
  if (tokens.length === 0) return detections;
  return detections.flatMap((detection) => {
    const pieces = carve(detection, tokens, text);
    if (pieces.length === 1 && pieces[0] === detection) return pieces;
    return pieces
      .map((piece) => trimWhitespace(piece, text))
      .filter((piece) => /[\p{L}\p{N}]/u.test(piece.text));
  });
}

function collapse(
  detections: readonly PiiDetection[],
  text: string,
): PiiDetection[] {
  const sorted = [...detections].sort(
    (a, b) => a.start - b.start || b.end - a.end,
  );
  const kept: PiiDetection[] = [];
  let lastEnd = -1;
  for (const detection of sorted) {
    if (detection.end <= lastEnd) continue;
    kept.push(
      withRange(
        detection,
        Math.max(detection.start, lastEnd),
        detection.end,
        text,
      ),
    );
    lastEnd = detection.end;
  }
  return kept;
}

function carve(
  detection: PiiDetection,
  blockers: readonly Range[],
  text: string,
): PiiDetection[] {
  const pieces: PiiDetection[] = [];
  let cursor = detection.start;
  for (const blocker of blockers) {
    if (blocker.end <= cursor || blocker.start >= detection.end) continue;
    if (blocker.start > cursor) {
      pieces.push(withRange(detection, cursor, blocker.start, text));
    }
    cursor = Math.max(cursor, blocker.end);
  }
  if (cursor < detection.end) {
    pieces.push(withRange(detection, cursor, detection.end, text));
  }
  return pieces;
}

function trimWhitespace(detection: PiiDetection, text: string): PiiDetection {
  let { start, end } = detection;
  while (start < end && /\s/.test(text[start])) start += 1;
  while (end > start && /\s/.test(text[end - 1])) end -= 1;
  return withRange(detection, start, end, text);
}

function withRange(
  detection: PiiDetection,
  start: number,
  end: number,
  text: string,
): PiiDetection {
  if (start === detection.start && end === detection.end) return detection;
  return { ...detection, start, end, text: text.substring(start, end) };
}
