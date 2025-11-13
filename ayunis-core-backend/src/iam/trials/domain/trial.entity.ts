import { randomUUID, UUID } from 'crypto';

export interface TrialParams {
  id?: UUID;
  createdAt?: Date;
  updatedAt?: Date;
  orgId: UUID;
  messagesSent?: number;
  maxMessages: number;
}

export class Trial {
  id: UUID;
  createdAt: Date;
  updatedAt: Date;
  orgId: UUID;
  messagesSent: number;
  maxMessages: number;

  constructor(params: TrialParams) {
    this.id = params.id ?? randomUUID();
    this.createdAt = params.createdAt ?? new Date();
    this.updatedAt = params.updatedAt ?? new Date();
    this.orgId = params.orgId;
    this.messagesSent = params.messagesSent ?? 0;
    this.maxMessages = params.maxMessages;
  }
}

