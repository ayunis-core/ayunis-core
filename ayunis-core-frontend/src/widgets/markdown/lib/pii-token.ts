/**
 * Matches anonymization placeholder tokens like `{{pii:PERSON_NAME_1}}`.
 * The full match (including braces) is the dictionary key delivered by the
 * backend (`PiiMaskResponseDto.token`).
 */
export const PII_TOKEN_REGEX = /\{\{pii:[A-Z][A-Z0-9_]*_\d+\}\}/g;

export type PiiTextPart =
  { kind: 'text'; text: string } | { kind: 'token'; token: string };

/** Splits text into plain-text parts and `{{pii:...}}` token parts. */
export function splitPiiTokens(text: string): PiiTextPart[] {
  const parts: PiiTextPart[] = [];
  let lastIndex = 0;
  for (const match of text.matchAll(PII_TOKEN_REGEX)) {
    if (match.index > lastIndex) {
      parts.push({ kind: 'text', text: text.slice(lastIndex, match.index) });
    }
    parts.push({ kind: 'token', token: match[0] });
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < text.length) {
    parts.push({ kind: 'text', text: text.slice(lastIndex) });
  }
  return parts;
}

/** True when the text contains at least one `{{pii:...}}` token. */
export function containsPiiToken(text: string): boolean {
  // Reset lastIndex since the shared regex is global.
  PII_TOKEN_REGEX.lastIndex = 0;
  return PII_TOKEN_REGEX.test(text);
}

/**
 * Replaces every `{{pii:...}}` token with its original value from the thread's
 * mask dictionary. Unknown tokens are left as the literal token text. Use this
 * at egress points (clipboard, mailto, file export) where the resolved value is
 * needed — display surfaces should keep rendering tokens via the mask context.
 */
export function resolvePiiTokens(
  text: string,
  masks: ReadonlyMap<string, { value: string }>,
): string {
  return text.replace(
    PII_TOKEN_REGEX,
    (token) => masks.get(token)?.value ?? token,
  );
}
