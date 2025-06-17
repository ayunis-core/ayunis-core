import { UUID, randomUUID } from 'crypto';
import { SourceType } from './source-type.enum';
import { SourceContent } from './source-content.entity';

export abstract class Source {
  id: UUID;
  threadId?: UUID;
  userId: UUID;
  type: SourceType;
  createdAt: Date;
  updatedAt: Date;
  content: SourceContent[];

  constructor(params: {
    id?: UUID;
    threadId?: UUID;
    userId: UUID;
    type: SourceType;
    content: SourceContent[];
    createdAt?: Date;
    updatedAt?: Date;
  }) {
    this.id = params.id ?? randomUUID();
    this.threadId = params.threadId;
    this.userId = params.userId;
    this.type = params.type;
    this.content = params.content;
    this.createdAt = params.createdAt ?? new Date();
    this.updatedAt = params.updatedAt ?? new Date();
  }
}
