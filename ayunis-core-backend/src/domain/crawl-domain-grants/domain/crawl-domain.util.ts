import { InvalidCrawlDomainError } from './crawl-domain.errors';

// General hostname shape: dot-separated labels of [a-z0-9-] (no leading/
// trailing hyphen per label), max 253 chars total. Permits single-label
// internal hosts and IPv4 literals; rejects whitespace and malformed input.
const HOSTNAME_REGEX =
  /^(?=.{1,253}$)([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)(\.[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)*$/;

const SCHEME_REGEX = /^[a-z][a-z0-9+.-]*:\/\//;

/**
 * Reduce a user-supplied URL or bare host to its canonical, lowercased host.
 * Used both when a super admin registers a grant and (indirectly) as the
 * comparison key for the crawl chokepoint. Throws `InvalidCrawlDomainError`
 * when the input cannot be reduced to a valid hostname.
 */
export function normalizeHost(input: string): string {
  const trimmed = input.trim().toLowerCase();
  if (!trimmed) {
    throw new InvalidCrawlDomainError(input);
  }

  let host: string;
  try {
    const candidate = SCHEME_REGEX.test(trimmed)
      ? trimmed
      : `http://${trimmed}`;
    host = new URL(candidate).hostname;
  } catch {
    throw new InvalidCrawlDomainError(input);
  }

  host = host.replace(/\.$/, '');

  if (!HOSTNAME_REGEX.test(host)) {
    throw new InvalidCrawlDomainError(input);
  }

  return host;
}
