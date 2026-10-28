/**
 * A window of the full text, measured in code points so it matches the
 * indices the anonymize service reports.
 */
export interface TextChunk {
  readonly start: number;
  readonly end: number;
  readonly text: string;
}

interface Span {
  readonly start: number;
  readonly end: number;
  readonly entity_type: string;
}

const isWhitespace = (codePoint: string | undefined): boolean =>
  codePoint !== undefined && /\s/.test(codePoint);

/**
 * Cuts `codePoints` into windows of at most `maxLength` that overlap by at
 * least `overlap`, so an entity straddling a cut is seen whole by one of its
 * two windows as long as it is shorter than the overlap. A cut, and the start
 * of the window after it, move back to the nearest whitespace within
 * `overlap` code points so the model never sees a word fragment at an edge.
 */
export function splitIntoChunks(
  codePoints: readonly string[],
  maxLength: number,
  overlap: number,
): TextChunk[] {
  const total = codePoints.length;
  const chunks: TextChunk[] = [];
  let start = 0;
  for (;;) {
    if (start + maxLength >= total) {
      chunks.push(chunk(codePoints, start, total));
      return chunks;
    }
    const end = afterLastWhitespace(codePoints, start + maxLength, overlap);
    chunks.push(chunk(codePoints, start, end));
    start = afterLastWhitespace(codePoints, end - overlap, overlap);
  }
}

const chunk = (
  codePoints: readonly string[],
  start: number,
  end: number,
): TextChunk => ({ start, end, text: codePoints.slice(start, end).join('') });

/**
 * The index just after the last whitespace in `(index - window, index]`, or
 * `index` itself when there is none.
 */
function afterLastWhitespace(
  codePoints: readonly string[],
  index: number,
  window: number,
): number {
  for (let i = index; i > index - window && i > 0; i -= 1) {
    if (isWhitespace(codePoints[i - 1])) {
      return i;
    }
  }
  return index;
}

/**
 * Shifts each chunk's spans to full-text offsets and unions overlapping spans
 * of the same entity type. Two chunks report the same entity when it lies in
 * their shared overlap, and an entity cut by a chunk edge comes back as a
 * prefix from one chunk and as the whole (or the suffix) from the other; the
 * union keeps one span that covers everything either chunk saw. Spans of
 * different types are left as they are, so no span is relabelled before the
 * whitelist sees it.
 *
 * A chunk edge inside a token longer than the overlap (a long URL) is the one
 * cut the other chunk cannot repair: it never sees the token's start, so a
 * recogniser keyed on it reports nothing. A span that ends on such a cut, or
 * starts on one, is therefore extended through the token to the next (or
 * previous) whitespace in the full text before merging.
 */
export function mergeChunkSpans<T extends Span>(
  chunks: readonly TextChunk[],
  spansPerChunk: readonly (readonly T[])[],
  codePoints: readonly string[],
): T[] {
  const shifted = chunks.flatMap((chunk, index) =>
    spansPerChunk[index].map((span) =>
      extendThroughCutToken(
        {
          ...span,
          start: chunk.start + span.start,
          end: chunk.start + span.end,
        },
        chunk,
        codePoints,
      ),
    ),
  );
  const byType = new Map<string, T[]>();
  for (const span of shifted) {
    byType.set(span.entity_type, [
      ...(byType.get(span.entity_type) ?? []),
      span,
    ]);
  }
  const merged = [...byType.values()].flatMap(unionOverlapping);
  return merged.sort((a, b) => a.start - b.start || b.end - a.end);
}

function extendThroughCutToken<T extends Span>(
  span: T,
  chunk: TextChunk,
  codePoints: readonly string[],
): T {
  const start = extendedStart(span, chunk, codePoints);
  const end = extendedEnd(span, chunk, codePoints);
  return start === span.start && end === span.end
    ? span
    : { ...span, start, end };
}

function extendedEnd(
  span: Span,
  chunk: TextChunk,
  codePoints: readonly string[],
): number {
  if (span.end !== chunk.end || !isInsideToken(codePoints, chunk.end)) {
    return span.end;
  }
  let end = span.end;
  while (end < codePoints.length && !isWhitespace(codePoints[end])) end += 1;
  return end;
}

function extendedStart(
  span: Span,
  chunk: TextChunk,
  codePoints: readonly string[],
): number {
  if (span.start !== chunk.start || !isInsideToken(codePoints, chunk.start)) {
    return span.start;
  }
  let start = span.start;
  while (start > 0 && !isWhitespace(codePoints[start - 1])) start -= 1;
  return start;
}

/** True when the boundary before `index` splits a run of non-whitespace. */
const isInsideToken = (codePoints: readonly string[], index: number): boolean =>
  index > 0 &&
  index < codePoints.length &&
  !isWhitespace(codePoints[index - 1]) &&
  !isWhitespace(codePoints[index]);

function unionOverlapping<T extends Span>(spans: readonly T[]): T[] {
  const sorted = [...spans].sort((a, b) => a.start - b.start || b.end - a.end);
  const merged: T[] = [];
  for (const span of sorted) {
    const last = merged.at(-1);
    if (last === undefined || span.start >= last.end) {
      merged.push(span);
    } else if (span.end > last.end) {
      merged[merged.length - 1] = { ...last, end: span.end };
    }
  }
  return merged;
}
