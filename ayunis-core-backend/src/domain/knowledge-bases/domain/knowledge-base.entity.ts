import type { UUID } from 'crypto';
import { randomUUID } from 'crypto';

export class InvalidKnowledgeBaseOwnershipError extends Error {
  constructor() {
    super('A knowledge base must belong to exactly one user or workspace.');
    this.name = 'InvalidKnowledgeBaseOwnershipError';
  }
}

export class KnowledgeBase {
  id: UUID;
  name: string;
  description: string;
  orgId: UUID;
  userId: UUID | null;
  workspaceId: UUID | null;
  originKnowledgeBaseId: UUID | null;
  version: number;
  importedOriginVersion: number | null;
  dismissedOriginVersion: number | null;
  createdAt: Date;
  updatedAt: Date;

  constructor(params: {
    id?: UUID;
    name: string;
    description?: string;
    orgId: UUID;
    userId?: UUID | null;
    workspaceId?: UUID | null;
    originKnowledgeBaseId?: UUID | null;
    version?: number;
    importedOriginVersion?: number | null;
    dismissedOriginVersion?: number | null;
    createdAt?: Date;
    updatedAt?: Date;
  }) {
    this.id = params.id ?? randomUUID();
    this.name = params.name;
    this.description = params.description ?? '';
    this.orgId = params.orgId;
    this.userId = params.userId ?? null;
    this.workspaceId = params.workspaceId ?? null;
    if ((this.userId === null) === (this.workspaceId === null)) {
      throw new InvalidKnowledgeBaseOwnershipError();
    }
    this.originKnowledgeBaseId = params.originKnowledgeBaseId ?? null;
    this.version = params.version ?? 1;
    this.importedOriginVersion = params.importedOriginVersion ?? null;
    this.dismissedOriginVersion = params.dismissedOriginVersion ?? null;
    this.createdAt = params.createdAt ?? new Date();
    this.updatedAt = params.updatedAt ?? new Date();
  }

  get personalOwnerId(): UUID {
    if (this.userId === null) throw new InvalidKnowledgeBaseOwnershipError();
    return this.userId;
  }
}
