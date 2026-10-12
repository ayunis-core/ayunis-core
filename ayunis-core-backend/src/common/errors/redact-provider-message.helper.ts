const MAX_LENGTH = 300;
const REQUEST_VALUE_START = /["'`[{]/;

/**
 * Reduces a provider's error text to the part that is safe to log. Providers
 * echo the offending request value inside quotes, brackets or braces, so the
 * text is cut at the first of those; the parameter path travels separately
 * in the diagnostics. Whitespace is collapsed and the result is bounded.
 */
export function redactProviderMessage(
  message: string | undefined,
): string | undefined {
  const collapsed = message?.replaceAll(/\s+/g, ' ').trim();
  if (!collapsed) return undefined;
  const cut = REQUEST_VALUE_START.exec(collapsed);
  const explanation = cut ? `${collapsed.slice(0, cut.index + 1)}…` : collapsed;
  return explanation.length > MAX_LENGTH
    ? `${explanation.slice(0, MAX_LENGTH)}…`
    : explanation;
}
