import type { UUID } from 'crypto';
import { randomUUID } from 'crypto';

export class McpOAuthPendingSession {
  public readonly id: UUID;
  public readonly stateHash: string;
  public readonly encryptedCodeVerifier: string;
  public readonly redirectUri: string;
  public readonly integrationId: UUID;
  public readonly orgId: UUID;
  public readonly userId: UUID;
  public readonly issuer: string;
  public readonly expiresAt: Date;
  public consumedAt?: Date;
  public readonly createdAt: Date;
  public updatedAt: Date;

  constructor(params: {
    id?: UUID;
    stateHash: string;
    encryptedCodeVerifier: string;
    redirectUri: string;
    integrationId: UUID;
    orgId: UUID;
    userId: UUID;
    issuer: string;
    expiresAt: Date;
    consumedAt?: Date;
    createdAt?: Date;
    updatedAt?: Date;
  }) {
    this.id = params.id ?? randomUUID();
    this.stateHash = params.stateHash;
    this.encryptedCodeVerifier = params.encryptedCodeVerifier;
    this.redirectUri = params.redirectUri;
    this.integrationId = params.integrationId;
    this.orgId = params.orgId;
    this.userId = params.userId;
    this.issuer = params.issuer;
    this.expiresAt = params.expiresAt;
    this.consumedAt = params.consumedAt;
    this.createdAt = params.createdAt ?? new Date();
    this.updatedAt = params.updatedAt ?? new Date();
  }

  get isConsumed(): boolean {
    return this.consumedAt !== undefined;
  }

  isExpired(referenceDate: Date = new Date()): boolean {
    return this.expiresAt <= referenceDate;
  }

  consume(consumedAt: Date = new Date()): void {
    this.consumedAt = consumedAt;
    this.updatedAt = consumedAt;
  }
}
