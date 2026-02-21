import type { UUID } from 'crypto';
import { randomUUID } from 'crypto';
import type { SourceType } from './source-type.enum';
import { SourceCreator } from './source-creator.enum';

export abstract class Source {
  id: UUID;
  type: SourceType;
  name: string;
  createdBy: SourceCreator;
  knowledgeBaseId: UUID | null;
  createdAt: Date;
  updatedAt: Date;

  constructor(params: {
    id?: UUID;
    type: SourceType;
    name: string;
    createdBy?: SourceCreator;
    knowledgeBaseId?: UUID | null;
    createdAt?: Date;
    updatedAt?: Date;
  }) {
    this.id = params.id ?? randomUUID();
    this.type = params.type;
    this.name = params.name;
    this.createdBy = params.createdBy ?? SourceCreator.USER;
    this.knowledgeBaseId = params.knowledgeBaseId ?? null;
    this.createdAt = params.createdAt ?? new Date();
    this.updatedAt = params.updatedAt ?? new Date();
  }
}
