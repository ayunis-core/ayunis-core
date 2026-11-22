import type {
  Microsoft365Credentials,
  Microsoft365Setup,
} from 'src/domain/connectors/providers/microsoft-365/domain/microsoft-365-connection';

export enum EntraResource {
  MICROSOFT_GRAPH = 'microsoft_graph',
  SHAREPOINT = 'sharepoint',
}

export type EntraAppCredentials = Microsoft365Setup & Microsoft365Credentials;

export enum EntraTokenRejection {
  TENANT_NOT_FOUND = 'tenant_not_found',
  CLIENT_NOT_FOUND = 'client_not_found',
  CLIENT_SECRET_INVALID = 'client_secret_invalid',
  CLIENT_SECRET_EXPIRED = 'client_secret_expired',
  OTHER = 'other',
}

export type EntraAppToken =
  | {
      status: 'issued';
      accessToken: string;
      /** Application permissions granted on the resource. */
      roles: string[];
      expiresAt: Date;
    }
  | {
      status: 'rejected';
      reason: EntraTokenRejection;
      /** Entra's error code, e.g. `AADSTS7000215`; `null` when it sent none. */
      errorCode: string | null;
    };

/**
 * App-only tokens of the organization's own Entra app (client credentials
 * flow). Tokens never leave the connectors module.
 */
export abstract class EntraAppTokenPort {
  /**
   * Resolves with Entra's refusal when it rejects the credentials; throws a
   * `ProviderUnavailableError` when Entra cannot be reached or fails.
   */
  abstract requestToken(
    credentials: EntraAppCredentials,
    resource: EntraResource,
  ): Promise<EntraAppToken>;
}
