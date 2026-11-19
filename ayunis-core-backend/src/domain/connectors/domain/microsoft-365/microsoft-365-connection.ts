import type { ConnectorSetup } from 'src/domain/connectors/domain/connector.entity';

/** Entra tenant and client IDs are GUIDs, whatever their UUID version. */
export const GUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** The organization's own Entra app registration. */
export type Microsoft365Setup = {
  tenantId: string;
  clientId: string;
};

export interface Microsoft365Credentials {
  clientSecret: string;
}

/** `null` while the connector has no Microsoft 365 setup, e.g. once removed. */
export function readMicrosoft365Setup(
  setup: ConnectorSetup,
): Microsoft365Setup | null {
  const { tenantId, clientId } = setup;
  return tenantId && clientId ? { tenantId, clientId } : null;
}

export function readMicrosoft365Credentials(
  plaintext: string,
): Microsoft365Credentials {
  const { clientSecret } = JSON.parse(
    plaintext,
  ) as Partial<Microsoft365Credentials>;
  if (typeof clientSecret !== 'string' || clientSecret === '') {
    throw new Error('Microsoft 365 credentials without a client secret');
  }
  return { clientSecret };
}
