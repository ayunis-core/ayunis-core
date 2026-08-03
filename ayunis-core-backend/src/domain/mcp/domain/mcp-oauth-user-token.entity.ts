import type { UUID } from 'crypto';
import { randomUUID } from 'crypto';
import { normalizeScopes } from './value-objects/integration-config-schema';

export class McpOAuthUserToken {
  public readonly id: UUID;
  public readonly integrationId: UUID;
  public readonly userId: UUID;
  public issuer: string;
  public encryptedAccessToken: string;
  public encryptedRefreshToken?: string;
  public expiresAt?: Date;
  public tokenType?: string;
  public scopes: string[];
  public readonly createdAt: Date;
  public updatedAt: Date;

  constructor(params: {
    id?: UUID;
    integrationId: UUID;
    userId: UUID;
    issuer: string;
    encryptedAccessToken: string;
    encryptedRefreshToken?: string;
    expiresAt?: Date;
    tokenType?: string;
    scopes?: string[];
    createdAt?: Date;
    updatedAt?: Date;
  }) {
    this.id = params.id ?? randomUUID();
    this.integrationId = params.integrationId;
    this.userId = params.userId;
    this.issuer = params.issuer;
    this.encryptedAccessToken = params.encryptedAccessToken;
    this.encryptedRefreshToken = params.encryptedRefreshToken;
    this.expiresAt = params.expiresAt;
    this.tokenType = params.tokenType;
    this.scopes = normalizeScopes(params.scopes);
    this.createdAt = params.createdAt ?? new Date();
    this.updatedAt = params.updatedAt ?? new Date();
  }

  isExpired(referenceDate: Date = new Date()): boolean {
    return Boolean(this.expiresAt && this.expiresAt <= referenceDate);
  }
}
