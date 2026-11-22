import { diffWordsWithSpace, type Change } from 'diff';
import type { MaskRegistry } from 'src/common/anonymization/domain/apply-mask-replacements';
import { findPiiTokenRanges } from 'src/common/anonymization/domain/deanonymize-text';
import type { PiiCategory } from 'src/common/anonymization/domain/pii-category.enum';
import type { PiiMask } from 'src/common/anonymization/domain/pii-mask';
import { formatPiiToken } from 'src/common/anonymization/domain/pii-mask';

/** Bounds the diff of very different versions; the edit then counts as new as a whole. */
const ALIGNMENT_TIMEOUT_MS = 1000;

export interface TextRange {
  start: number;
  end: number;
}

/**
 * How a real value is written into an artifact's text. The editor shows a
 * document's values HTML-escaped, exactly as the stored HTML would carry
 * them as text; diagrams and spreadsheet strings carry them as they are.
 */
export interface ValueEncoding {
  encode: (value: string) => string;
  decode: (text: string) => string;
}

export const PLAIN_VALUES: ValueEncoding = {
  encode: (value) => value,
  decode: (text) => text,
};

export const HTML_TEXT_VALUES: ValueEncoding = {
  encode: (value) =>
    value
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;'),
  decode: (text) =>
    text
      .replaceAll('&lt;', '<')
      .replaceAll('&gt;', '>')
      .replaceAll('&amp;', '&'),
};

/**
 * A user's save of an anonymous artifact, aligned with the stored version:
 * the placeholders of the values the user left unchanged are restored, and
 * everything typed or changed is in `changed`, with real values.
 */
export interface AlignedEdit {
  text: string;
  changed: TextRange[];
}

/** A range of an aligned edit to replace with the placeholder of a value. */
export interface PlaceholderReplacement extends TextRange {
  category: PiiCategory;
  value: string;
}

interface ResolvedToken extends TextRange {
  token: string;
}

/**
 * Aligns the edited text, which holds the real values the editor showed,
 * with the stored text, which holds the placeholders. The editor shows a
 * placeholder's value in its place, so a value the user did not touch is
 * found by its position, not by searching for it: text that merely contains
 * a value (`Anna` in `Annahme`) stays as stored, and saving without changes
 * stores the same text.
 */
export async function alignEdit(
  stored: string,
  edited: string,
  dictionary: PiiMask[],
  encoding: ValueEncoding,
): Promise<AlignedEdit> {
  const { resolved, tokens } = resolvePlaceholders(
    stored,
    dictionary,
    encoding,
  );
  if (resolved === edited) {
    return { text: stored, changed: [] };
  }
  const changes = await diffWords(resolved, edited);
  if (!changes) {
    return { text: edited, changed: [{ start: 0, end: edited.length }] };
  }
  return buildAlignedEdit(changes, resolved, tokens);
}

function resolvePlaceholders(
  stored: string,
  dictionary: PiiMask[],
  encoding: ValueEncoding,
): { resolved: string; tokens: ResolvedToken[] } {
  const values = new Map(
    dictionary.map((mask) => [
      formatPiiToken(mask),
      encoding.encode(mask.value),
    ]),
  );
  const tokens: ResolvedToken[] = [];
  let resolved = '';
  let position = 0;
  for (const { start, end } of findPiiTokenRanges(stored)) {
    const token = stored.slice(start, end);
    const value = values.get(token);
    if (value === undefined) continue;
    resolved += stored.slice(position, start);
    tokens.push({
      token,
      start: resolved.length,
      end: resolved.length + value.length,
    });
    resolved += value;
    position = end;
  }
  resolved += stored.slice(position);
  return { resolved, tokens };
}

function diffWords(
  before: string,
  after: string,
): Promise<Change[] | undefined> {
  return new Promise((resolve) =>
    diffWordsWithSpace(before, after, {
      timeout: ALIGNMENT_TIMEOUT_MS,
      callback: resolve,
    }),
  );
}

/**
 * Rebuilds the edited text from the diff. Unchanged text is taken over as
 * stored, a value's placeholder only when the value is unchanged as a whole;
 * the rest of a partly changed value counts as changed.
 */
function buildAlignedEdit(
  changes: Change[],
  resolved: string,
  tokens: ResolvedToken[],
): AlignedEdit {
  const edit: AlignedEdit = { text: '', changed: [] };
  let position = 0;
  for (const change of changes) {
    if (change.removed) {
      position += change.value.length;
      continue;
    }
    if (change.added) {
      appendChanged(edit, change.value);
      continue;
    }
    const end = position + change.value.length;
    appendUnchanged(edit, resolved, tokens, { start: position, end });
    position = end;
  }
  return edit;
}

function appendUnchanged(
  edit: AlignedEdit,
  resolved: string,
  tokens: ResolvedToken[],
  range: TextRange,
): void {
  let position = range.start;
  for (const token of tokens) {
    if (token.end <= range.start || token.start >= range.end) continue;
    if (token.start > position) {
      edit.text += resolved.slice(position, token.start);
    }
    const end = Math.min(token.end, range.end);
    if (token.start >= range.start && token.end <= range.end) {
      edit.text += token.token;
    } else {
      appendChanged(edit, resolved.slice(Math.max(token.start, position), end));
    }
    position = end;
  }
  edit.text += resolved.slice(position, range.end);
}

function appendChanged(edit: AlignedEdit, text: string): void {
  if (text === '') return;
  const start = edit.text.length;
  edit.text += text;
  const last = edit.changed.at(-1);
  if (last?.end === start) {
    last.end = edit.text.length;
  } else {
    edit.changed.push({ start, end: edit.text.length });
  }
}

/**
 * Values of the dictionary in the changed text, by exact lookup: a value
 * the user typed again, or left in place in text around it they changed,
 * keeps its placeholder. Longer values win over values they contain; a value
 * only counts as a whole word.
 */
export function findKnownValues(
  edit: AlignedEdit,
  dictionary: PiiMask[],
  encoding: ValueEncoding,
): PlaceholderReplacement[] {
  if (edit.changed.length === 0) return [];
  const found: PlaceholderReplacement[] = [];
  const taken: TextRange[] = findPiiTokenRanges(edit.text);
  const byLength = dictionary
    .map((mask) => ({ mask, text: encoding.encode(mask.value) }))
    .filter(({ text }) => text.trim() !== '')
    .sort((a, b) => b.text.length - a.text.length);
  for (const { mask, text } of byLength) {
    for (const range of findWholeWords(edit.text, text)) {
      if (!overlapsAny(range, edit.changed) || overlapsAny(range, taken)) {
        continue;
      }
      taken.push(range);
      found.push({ ...range, category: mask.category, value: mask.value });
    }
  }
  return found;
}

function findWholeWords(text: string, word: string): TextRange[] {
  const ranges: TextRange[] = [];
  let start = text.indexOf(word);
  while (start !== -1) {
    const end = start + word.length;
    if (
      !continuesWord(text[start - 1], word[0]) &&
      !continuesWord(word.at(-1), text[end])
    ) {
      ranges.push({ start, end });
    }
    start = text.indexOf(word, start + 1);
  }
  return ranges;
}

const WORD_CHARACTER = /[\p{L}\p{N}]/u;

function continuesWord(left?: string, right?: string): boolean {
  return (
    left !== undefined &&
    right !== undefined &&
    WORD_CHARACTER.test(left) &&
    WORD_CHARACTER.test(right)
  );
}

interface Candidate {
  replacement: PlaceholderReplacement;
  isKnown: boolean;
}

/**
 * Joins the detected values with the known ones. A known value keeps its
 * placeholder where detection found it or a part of it; where detection found
 * a longer value around or across it, the whole span gets one placeholder,
 * so no part of the detected value is stored unmasked.
 */
export function addDetectedValues(
  text: string,
  known: PlaceholderReplacement[],
  detected: PlaceholderReplacement[],
  encoding: ValueEncoding,
): PlaceholderReplacement[] {
  const candidates: Candidate[] = [
    ...known.map((replacement) => ({ replacement, isKnown: true })),
    ...detected.map((replacement) => ({ replacement, isKnown: false })),
  ].sort((a, b) => a.replacement.start - b.replacement.start);
  const clusters: Candidate[][] = [];
  let cluster: Candidate[] = [];
  let clusterEnd = -1;
  for (const candidate of candidates) {
    if (candidate.replacement.start >= clusterEnd) {
      cluster = [];
      clusters.push(cluster);
    }
    cluster.push(candidate);
    clusterEnd = Math.max(clusterEnd, candidate.replacement.end);
  }
  return clusters.map((overlapping) =>
    mergeOverlapping(text, overlapping, encoding),
  );
}

function mergeOverlapping(
  text: string,
  cluster: Candidate[],
  encoding: ValueEncoding,
): PlaceholderReplacement {
  const start = Math.min(
    ...cluster.map(({ replacement }) => replacement.start),
  );
  const end = Math.max(...cluster.map(({ replacement }) => replacement.end));
  const spanning = cluster.filter(
    ({ replacement }) => replacement.start === start && replacement.end === end,
  );
  const covering = spanning.find(({ isKnown }) => isKnown) ?? spanning.at(0);
  if (covering) {
    return covering.replacement;
  }
  const [longestDetected] = cluster
    .filter(({ isKnown }) => !isKnown)
    .map(({ replacement }) => replacement)
    .sort((a, b) => b.end - b.start - (a.end - a.start));
  return {
    start,
    end,
    category: longestDetected.category,
    value: encoding.decode(text.slice(start, end)),
  };
}

export function overlapsAny(range: TextRange, ranges: TextRange[]): boolean {
  return ranges.some(
    (other) => range.start < other.end && other.start < range.end,
  );
}

/**
 * Replaces the ranges with the registry's placeholders for their values;
 * ranges must not overlap.
 */
export function replaceWithPlaceholders(
  text: string,
  replacements: PlaceholderReplacement[],
  registry: MaskRegistry,
): string {
  const inDocumentOrder = [...replacements].sort((a, b) => a.start - b.start);
  let result = '';
  let position = 0;
  for (const replacement of inDocumentOrder) {
    const mask = registry.resolve(replacement.category, replacement.value);
    result += text.slice(position, replacement.start) + formatPiiToken(mask);
    position = replacement.end;
  }
  return result + text.slice(position);
}
