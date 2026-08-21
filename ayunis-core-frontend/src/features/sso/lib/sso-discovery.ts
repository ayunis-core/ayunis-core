interface SsoDiscovery {
  available: boolean;
  orgId?: string;
}

export function isSsoAvailableForOrg(
  discovery: SsoDiscovery,
  orgId: string,
): boolean {
  return discovery.available && discovery.orgId === orgId;
}
