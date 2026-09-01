import type { UUID } from 'crypto';
import { randomUUID } from 'crypto';

export class KnowledgeBase {
  id: UUID;
  name: string;
  description: string;
  orgId: UUID;
  userId: UUID;
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
    userId: UUID;
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
    this.userId = params.userId;
    this.workspaceId = params.workspaceId ?? null;
    this.originKnowledgeBaseId = params.originKnowledgeBaseId ?? null;
    this.version = params.version ?? 1;
    this.importedOriginVersion = params.importedOriginVersion ?? null;
    this.dismissedOriginVersion = params.dismissedOriginVersion ?? null;
    this.createdAt = params.createdAt ?? new Date();
    this.updatedAt = params.updatedAt ?? new Date();
  }
}
