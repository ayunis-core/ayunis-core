import type { UUID } from 'crypto';
import { randomUUID } from 'crypto';

export interface SsoLoginTransactionParams {
  id?: UUID;
  stateHash: string;
  browserBindingHash: string;
  postLoginPath: string;
  encryptedCodeVerifier: string;
  encryptedNonce: string;
  orgId: UUID;
  zitadelOrgId: string;
  expiresAt: Date;
  consumedAt?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

export class SsoLoginTransaction {
  readonly id: UUID;
  readonly stateHash: string;
  readonly browserBindingHash: string;
  readonly postLoginPath: string;
  readonly encryptedCodeVerifier: string;
  readonly encryptedNonce: string;
  readonly orgId: UUID;
  readonly zitadelOrgId: string;
  readonly expiresAt: Date;
  consumedAt?: Date;
  readonly createdAt: Date;
  updatedAt: Date;

  constructor(params: SsoLoginTransactionParams) {
    this.id = params.id ?? randomUUID();
    this.stateHash = params.stateHash;
    this.browserBindingHash = params.browserBindingHash;
    this.postLoginPath = params.postLoginPath;
    this.encryptedCodeVerifier = params.encryptedCodeVerifier;
    this.encryptedNonce = params.encryptedNonce;
    this.orgId = params.orgId;
    this.zitadelOrgId = params.zitadelOrgId;
    this.expiresAt = params.expiresAt;
    this.consumedAt = params.consumedAt;
    this.createdAt = params.createdAt ?? new Date();
    this.updatedAt = params.updatedAt ?? new Date();
  }
}
