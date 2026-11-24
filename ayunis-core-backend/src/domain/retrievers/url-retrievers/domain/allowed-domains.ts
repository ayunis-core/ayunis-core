import { isIP } from 'net';
import { domainToASCII } from 'url';

// Dot-separated labels of [a-z0-9-] without a leading or trailing hyphen,
// at most 253 characters.
const HOSTNAME_REGEX =
  /^(?=.{1,253}$)([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)(\.[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)*$/;

const SCHEME_REGEX = /^[a-z][a-z0-9+.-]*:\/\//i;

export type InvalidAllowedDomainReason =
  'invalid' | 'ip-address' | 'wildcard' | 'missing-dot';

export class InvalidAllowedDomainError extends Error {
  constructor(
    public readonly input: string,
    public readonly reason: InvalidAllowedDomainReason,
  ) {
    super(`Invalid allowed domain "${input}" (${reason})`);
    this.name = 'InvalidAllowedDomainError';
  }
}

/**
 * Reduces a URL or host to the lowercase ASCII (punycode) host an allowlist
 * stores. Throws `InvalidAllowedDomainError` for IP addresses, wildcards,
 * hosts without a dot and anything that is not a hostname.
 */
export function normalizeAllowedDomain(input: string): string {
  const trimmed = input.trim();
  if (trimmed.includes('*')) {
    throw new InvalidAllowedDomainError(input, 'wildcard');
  }
  // Parsing as http lowercases the host, converts it to punycode and
  // canonicalizes numeric IPv4 forms such as `127.1`.
  let host: string;
  try {
    host = new URL(`http://${trimmed.replace(SCHEME_REGEX, '')}`).hostname;
  } catch {
    throw new InvalidAllowedDomainError(input, 'invalid');
  }
  host = host.replace(/\.$/, '');
  if (host.startsWith('[') || isIP(host)) {
    throw new InvalidAllowedDomainError(input, 'ip-address');
  }
  if (!HOSTNAME_REGEX.test(host)) {
    throw new InvalidAllowedDomainError(input, 'invalid');
  }
  if (!host.includes('.')) {
    throw new InvalidAllowedDomainError(input, 'missing-dot');
  }
  return host;
}

/**
 * The web domains a run may access. A host is allowed when it equals an entry
 * or is a subdomain of one; an empty list allows nothing.
 */
export class AllowedDomains {
  readonly entries: readonly string[];

  constructor(entries: readonly string[]) {
    this.entries = [...new Set(entries.map(normalizeAllowedDomain))];
  }

  allowsHost(host: string): boolean {
    const normalized = domainToASCII(host.trim()).replace(/\.$/, '');
    if (!normalized) return false;
    return this.entries.some(
      (entry) => normalized === entry || normalized.endsWith(`.${entry}`),
    );
  }

  allowsUrl(url: string): boolean {
    let host: string;
    try {
      host = new URL(url).hostname;
    } catch {
      return false;
    }
    return this.allowsHost(host);
  }

  toString(): string {
    return this.entries.join(', ');
  }
}
