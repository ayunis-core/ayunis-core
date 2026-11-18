import type { Microsoft365ConnectionTestOutcome } from 'src/domain/connectors/domain/microsoft-365/microsoft-365-connection-test-outcome.enum';

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
