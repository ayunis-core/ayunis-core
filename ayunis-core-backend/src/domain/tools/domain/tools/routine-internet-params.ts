import {
  describeRoutineInternetSettingsProblem,
  ROUTINE_ALLOWED_DOMAINS_MAX,
  RoutineInternetAccess,
  routineInternetSettings,
} from 'src/domain/routines/domain/routine-internet-access';

export const routineInternetAccessParameter = {
  type: 'string' as const,
  enum: [
    RoutineInternetAccess.OFF,
    RoutineInternetAccess.ALL,
    RoutineInternetAccess.ALLOWLIST,
  ] as const,
  description:
    'Whether the routine may search and read the web: "off" for no web access, "all" for any website, "allowlist" for only the allowed_domains. Use internet access only when the task needs information from the internet, and "allowlist" when the user names the sites or domains to check, or when the task should use official sources only.',
};

export const routineAllowedDomainsParameter = {
  type: 'array' as const,
  items: { type: 'string' as const },
  maxItems: ROUTINE_ALLOWED_DOMAINS_MAX,
  description: `The domains the routine may access with internet_access "allowlist". Use exactly the domains the user names, without narrowing them: each includes its subdomains, so "nrw.de" also allows "recht.nrw.de". Hostnames only, no IP addresses or wildcards, at most ${ROUTINE_ALLOWED_DOMAINS_MAX}.`,
};

/** The API's rules for the internet settings, for the parameters given. */
export function assertValidRoutineInternetParams(
  internetAccess: RoutineInternetAccess,
  allowedDomains: readonly string[],
): void {
  const result = routineInternetSettings(internetAccess, allowedDomains);
  if (!result.ok) {
    throw new Error(
      `Invalid parameters: allowed_domains: ${describeRoutineInternetSettingsProblem(result.problem)}`,
    );
  }
}
