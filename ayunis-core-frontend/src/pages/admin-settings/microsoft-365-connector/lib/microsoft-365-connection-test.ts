import { Microsoft365ConnectionTestOutcome } from '@ayunis/api-client/schemas';
import { GUID_PATTERN } from '@/pages/admin-settings/microsoft-365-connector/model/microsoft365ConnectorFormSchema';

/** Without a token, nothing is known about the granted permissions. */
const WITHOUT_TOKEN: ReadonlySet<Microsoft365ConnectionTestOutcome> = new Set([
  Microsoft365ConnectionTestOutcome.tenant_not_found,
  Microsoft365ConnectionTestOutcome.client_not_found,
  Microsoft365ConnectionTestOutcome.client_secret_invalid,
  Microsoft365ConnectionTestOutcome.client_secret_expired,
  Microsoft365ConnectionTestOutcome.rejected,
  Microsoft365ConnectionTestOutcome.microsoft_unavailable,
  Microsoft365ConnectionTestOutcome.unexpected_error,
]);

export function showsPermissions(
  outcome: Microsoft365ConnectionTestOutcome,
): boolean {
  return !WITHOUT_TOKEN.has(outcome);
}

/** Entra shows a secret's ID, a GUID, right next to its value. */
export function looksLikeSecretId(clientSecret: string): boolean {
  return GUID_PATTERN.test(clientSecret.trim());
}
