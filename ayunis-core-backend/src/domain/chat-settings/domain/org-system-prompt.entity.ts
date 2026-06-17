import type { UUID } from 'crypto';
import { randomUUID } from 'crypto';

export class OrgSystemPrompt {
  id: UUID;
  orgId: UUID;
  systemPrompt: string;
  createdAt: Date;
  updatedAt: Date;

  constructor(params: {
    id?: UUID;
    orgId: UUID;
    systemPrompt: string;
    createdAt?: Date;
    updatedAt?: Date;
  }) {
    this.id = params.id ?? randomUUID();
    this.orgId = params.orgId;
    this.systemPrompt = params.systemPrompt;
    this.createdAt = params.createdAt ?? new Date();
    this.updatedAt = params.updatedAt ?? new Date();
  }
}
