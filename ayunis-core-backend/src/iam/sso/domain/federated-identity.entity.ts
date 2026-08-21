import type { UUID } from 'crypto';
import { randomUUID } from 'crypto';

export class FederatedIdentity {
  readonly id: UUID;
  readonly issuer: string;
  readonly subject: string;
  readonly userId: UUID;
  readonly createdAt: Date;
  readonly updatedAt: Date;

  constructor(params: {
    id?: UUID;
    issuer: string;
    subject: string;
    userId: UUID;
    createdAt?: Date;
    updatedAt?: Date;
  }) {
    this.id = params.id ?? randomUUID();
    this.issuer = params.issuer;
    this.subject = params.subject;
    this.userId = params.userId;
    this.createdAt = params.createdAt ?? new Date();
    this.updatedAt = params.updatedAt ?? new Date();
  }
}
