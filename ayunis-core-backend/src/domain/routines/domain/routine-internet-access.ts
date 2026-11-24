import {
  InvalidAllowedDomainError,
  normalizeAllowedDomain,
  type InvalidAllowedDomainReason,
} from 'src/domain/retrievers/url-retrievers/domain/allowed-domains';

export enum RoutineInternetAccess {
  OFF = 'off',
  ALL = 'all',
  /** Only the routine's allowed domains and their subdomains. */
  ALLOWLIST = 'allowlist',
}

/** Web search passes the list to Staan's `include_domains`, which takes at most 20. */
export const ROUTINE_ALLOWED_DOMAINS_MAX = 20;

export interface RoutineInternetSettings {
  internetAccess: RoutineInternetAccess;
  /** Normalized hosts; kept while another mode is set, applied only in `allowlist`. */
  allowedDomains: string[];
}

export type RoutineInternetSettingsProblem =
  | { reason: 'required' }
  | { reason: 'too-many' }
  | { reason: InvalidAllowedDomainReason; domain: string };

export type RoutineInternetSettingsResult =
  | { ok: true; settings: RoutineInternetSettings }
  | { ok: false; problem: RoutineInternetSettingsProblem };

/**
 * Normalizes and deduplicates the allowed domains and checks them against the
 * mode: at most {@link ROUTINE_ALLOWED_DOMAINS_MAX}, and at least one in
 * `allowlist` mode.
 */
export function routineInternetSettings(
  internetAccess: RoutineInternetAccess,
  allowedDomains: readonly string[],
): RoutineInternetSettingsResult {
  const normalized = new Set<string>();
  for (const domain of allowedDomains) {
    try {
      normalized.add(normalizeAllowedDomain(domain));
    } catch (error) {
      if (!(error instanceof InvalidAllowedDomainError)) throw error;
      return { ok: false, problem: { reason: error.reason, domain } };
    }
  }
  if (normalized.size > ROUTINE_ALLOWED_DOMAINS_MAX) {
    return { ok: false, problem: { reason: 'too-many' } };
  }
  if (
    internetAccess === RoutineInternetAccess.ALLOWLIST &&
    normalized.size === 0
  ) {
    return { ok: false, problem: { reason: 'required' } };
  }
  return {
    ok: true,
    settings: { internetAccess, allowedDomains: [...normalized] },
  };
}

export function describeRoutineInternetSettingsProblem(
  problem: RoutineInternetSettingsProblem,
): string {
  switch (problem.reason) {
    case 'required':
      return 'The allowlist mode needs at least one allowed domain';
    case 'too-many':
      return `At most ${ROUTINE_ALLOWED_DOMAINS_MAX} allowed domains are possible`;
    case 'ip-address':
      return `"${problem.domain}" is an IP address; allowed domains must be hostnames`;
    case 'wildcard':
      return `"${problem.domain}" contains a wildcard; an allowed domain already includes its subdomains`;
    case 'missing-dot':
      return `"${problem.domain}" is not a domain with a dot, such as nrw.de`;
    case 'invalid':
      return `"${problem.domain}" is not a valid domain`;
  }
}

/** The domains a run is limited to; undefined when it is not limited. */
export function runAllowedDomains(
  settings: RoutineInternetSettings,
): string[] | undefined {
  return settings.internetAccess === RoutineInternetAccess.ALLOWLIST
    ? settings.allowedDomains
    : undefined;
}
