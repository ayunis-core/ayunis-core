import type { UUID } from 'crypto';
import { randomUUID } from 'crypto';

export class ChildChunk {
  public readonly id: UUID;
  public readonly embedding: number[];
  public readonly parentId: UUID;
  public readonly createdAt: Date;
  public readonly updatedAt: Date;

  constructor(params: {
    id?: UUID;
    embedding: number[];
    parentId: UUID;
    createdAt?: Date;
    updatedAt?: Date;
  }) {
    this.id = params.id ?? randomUUID();
    this.embedding = params.embedding;
    this.parentId = params.parentId;
    this.createdAt = params.createdAt ?? new Date();
    this.updatedAt = params.updatedAt ?? new Date();
  }
}
