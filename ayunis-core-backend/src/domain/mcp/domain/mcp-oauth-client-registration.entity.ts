import type { UUID } from 'crypto';
import { randomUUID } from 'crypto';

export class McpOAuthClientRegistration {
  public readonly id: UUID;
  public readonly integrationId: UUID;
  public issuer: string | null;
  public readonly registrationMode: 'automatic' | 'static';
  public clientId: string;
  public encryptedClientSecret?: string;
  public clientSecretExpiresAt?: Date;
  public discoveryMetadata?: Record<string, unknown>;
  public readonly createdAt: Date;
  public updatedAt: Date;

  constructor(params: {
    id?: UUID;
    integrationId: UUID;
    issuer: string | null;
    registrationMode: 'automatic' | 'static';
    clientId: string;
    encryptedClientSecret?: string;
    clientSecretExpiresAt?: Date;
    discoveryMetadata?: Record<string, unknown>;
    createdAt?: Date;
    updatedAt?: Date;
  }) {
    this.id = params.id ?? randomUUID();
    this.integrationId = params.integrationId;
    this.issuer = params.issuer;
    this.registrationMode = params.registrationMode;
    this.clientId = params.clientId;
    this.encryptedClientSecret = params.encryptedClientSecret;
    this.clientSecretExpiresAt = params.clientSecretExpiresAt;
    this.discoveryMetadata = params.discoveryMetadata
      ? { ...params.discoveryMetadata }
      : undefined;
    this.createdAt = params.createdAt ?? new Date();
    this.updatedAt = params.updatedAt ?? new Date();
  }

  bindToIssuer(issuer: string): void {
    if (this.issuer !== null) {
      throw new Error('OAuth client registration is already issuer-bound');
    }
    this.issuer = issuer;
    this.updatedAt = new Date();
  }
}
