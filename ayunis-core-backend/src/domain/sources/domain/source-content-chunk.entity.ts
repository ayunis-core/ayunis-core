import { UUID, randomUUID } from 'crypto';

export class TextSourceContentChunk {
  id: UUID;
  content: string;
  meta: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;

  constructor(params: {
    id?: UUID;
    content: string;
    meta: Record<string, any>;
    createdAt?: Date;
    updatedAt?: Date;
  }) {
    this.id = params.id ?? randomUUID();
    this.content = params.content;
    this.meta = params.meta;
    this.createdAt = params.createdAt ?? new Date();
    this.updatedAt = params.updatedAt ?? new Date();
  }
}
