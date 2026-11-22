import type { Microsoft365ConnectionTestOutcome } from 'src/domain/connectors/providers/microsoft-365/domain/microsoft-365-connection-test-outcome.enum';
import { MICROSOFT_365_PERMISSIONS } from 'src/domain/connectors/providers/microsoft-365/domain/microsoft-365-permissions';

export interface Microsoft365PermissionGrant {
  name: string;
  required: boolean;
  granted: boolean;
}

/** What a test shows of the app's token: never the token itself. */
export interface Microsoft365ConnectionTestResult {
  outcome: Microsoft365ConnectionTestOutcome;
  /** The Microsoft Graph permissions Ayunis uses, granted or not. */
  permissions: Microsoft365PermissionGrant[];
  /** Microsoft Graph permissions granted to the app that Ayunis does not use. */
  otherGrantedPermissions: string[];
  /** Entra's error code when it refused the token, e.g. `AADSTS90002`. */
  entraErrorCode: string | null;
}

export function toMicrosoft365ConnectionTestResult(
  outcome: Microsoft365ConnectionTestOutcome,
  roles: string[] = [],
  entraErrorCode: string | null = null,
): Microsoft365ConnectionTestResult {
  const used = new Set<string>(
    MICROSOFT_365_PERMISSIONS.map(({ name }) => name),
  );
  return {
    outcome,
    permissions: MICROSOFT_365_PERMISSIONS.map(({ name, required }) => ({
      name,
      required,
      granted: roles.includes(name),
    })),
    otherGrantedPermissions: roles
      .filter((role) => !used.has(role))
      .sort((a, b) => a.localeCompare(b)),
    entraErrorCode,
  };
}
