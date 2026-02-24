import type { UUID } from 'crypto';
import { randomUUID } from 'crypto';

export class KnowledgeBase {
  id: UUID;
  name: string;
  description: string;
  orgId: UUID;
  userId: UUID;
  createdAt: Date;
  updatedAt: Date;

  constructor(params: {
    id?: UUID;
    name: string;
    description?: string;
    orgId: UUID;
    userId: UUID;
    createdAt?: Date;
    updatedAt?: Date;
  }) {
    this.id = params.id ?? randomUUID();
    this.name = params.name;
    this.description = params.description ?? '';
    this.orgId = params.orgId;
    this.userId = params.userId;
    this.createdAt = params.createdAt ?? new Date();
    this.updatedAt = params.updatedAt ?? new Date();
  }
}
