import type { UUID } from 'crypto';
import { randomUUID } from 'crypto';

export enum EmailDeliveryStatus {
  PENDING = 'pending',
  SENT = 'sent',
  FAILED = 'failed',
}

export class EmailDelivery {
  public readonly id: UUID;
  public readonly artifactId: UUID;
  public readonly versionNumber: number;
  public status: EmailDeliveryStatus;
  public errorMessage: string | null;
  public sentAt: Date | null;
  public readonly createdAt: Date;
  public updatedAt: Date;

  constructor(params: {
    id?: UUID;
    artifactId: UUID;
    versionNumber: number;
    status?: EmailDeliveryStatus;
    errorMessage?: string | null;
    sentAt?: Date | null;
    createdAt?: Date;
    updatedAt?: Date;
  }) {
    this.id = params.id ?? randomUUID();
    this.artifactId = params.artifactId;
    this.versionNumber = params.versionNumber;
    this.status = params.status ?? EmailDeliveryStatus.PENDING;
    this.errorMessage = params.errorMessage ?? null;
    this.sentAt = params.sentAt ?? null;
    this.createdAt = params.createdAt ?? new Date();
    this.updatedAt = params.updatedAt ?? new Date();
  }
}
