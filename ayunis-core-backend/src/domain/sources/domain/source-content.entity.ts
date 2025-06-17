import { UUID, randomUUID } from 'crypto';

export class SourceContent {
  id: UUID;
  sourceId: UUID;
  content: string;
  meta: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;

  constructor(params: {
    id?: UUID;
    sourceId: UUID;
    content: string;
    meta: Record<string, any>;
    createdAt?: Date;
    updatedAt?: Date;
  }) {
    this.id = params.id ?? randomUUID();
    this.sourceId = params.sourceId;
    this.content = params.content;
    this.meta = params.meta;
    this.createdAt = params.createdAt ?? new Date();
    this.updatedAt = params.updatedAt ?? new Date();
  }
}
