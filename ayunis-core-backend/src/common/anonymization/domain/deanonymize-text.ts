/**
 * Matches anonymization placeholder tokens like `{{pii:PERSON_NAME_1}}`. Mirrors
 * the format produced by `formatPiiToken` / `ThreadPiiMask.token`.
 */
const PII_TOKEN_REGEX = /\{\{pii:[A-Z][A-Z0-9_]*_\d+\}\}/g;

/**
 * Replaces every `{{pii:...}}` token with its original value from the thread's
 * mask dictionary. Unknown tokens are left as the literal token text. Use this
 * at egress points (e.g. document export) where the resolved value is needed;
 * stored content stays anonymized.
 */
export function deanonymizeText(
  text: string,
  tokenToValue: ReadonlyMap<string, string>,
): string {
  return text.replace(
    PII_TOKEN_REGEX,
    (token) => tokenToValue.get(token) ?? token,
  );
}
