const SUMMARY_MAX_LENGTH = 300;

/**
 * The start of a release note's markdown body as plain text, for the list's
 * two-line summary. Only the syntax release notes use is removed.
 */
export function releaseNoteSummary(body: string): string {
  const text = body
    .replace(/!\[[^\][]*\]\([^()]*\)/g, '')
    .replace(/\[([^\][]*)\]\([^()]*\)/g, '$1')
    .replace(/^\s{0,3}(#{1,6}|>|[-*+]|\d+\.)\s+/gm, '')
    .replace(/(\*\*|__|~~|`)/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  return text.length > SUMMARY_MAX_LENGTH
    ? `${text.slice(0, SUMMARY_MAX_LENGTH).trimEnd()}…`
    : text;
}
