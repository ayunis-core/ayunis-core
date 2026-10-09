const QUOTE_PAIRS = [
  ['"', '"'],
  ["'", "'"],
  ['„', '“'],
  ['„', '”'],
  ['“', '”'],
  ['‘', '’'],
  ['»', '«'],
  ['«', '»'],
] as const;

// Quote removal is best-effort: internal quotes can be meaningful trigger keywords.
// Preserve ambiguous wrapping instead of changing the author's content.
export function normalizeSkillText(text: string): string {
  text = text.trim();
  const pair = QUOTE_PAIRS.find(
    ([open, close]) =>
      text.length >= open.length + close.length &&
      text.startsWith(open) &&
      text.endsWith(close),
  );
  if (!pair) return text;
  const inner = text.slice(pair[0].length, -pair[1].length).trim();
  const [open, close] = pair;
  return inner.includes(open) || inner.includes(close) ? text : inner;
}
