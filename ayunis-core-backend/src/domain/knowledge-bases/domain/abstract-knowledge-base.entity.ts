import { randomUUID, type UUID } from 'crypto';

export interface AbstractKnowledgeBaseParams {
  id?: UUID;
  name: string;
  description?: string;
  orgId: UUID;
  createdAt?: Date;
  updatedAt?: Date;
}

export abstract class AbstractKnowledgeBase {
  id: UUID;
  name: string;
  description: string;
  orgId: UUID;
  createdAt: Date;
  updatedAt: Date;

  protected constructor(params: AbstractKnowledgeBaseParams) {
    this.id = params.id ?? randomUUID();
    this.name = params.name;
    this.description = params.description ?? '';
    this.orgId = params.orgId;
    this.createdAt = params.createdAt ?? new Date();
    this.updatedAt = params.updatedAt ?? new Date();
  }
}
