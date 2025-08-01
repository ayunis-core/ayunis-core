import { randomUUID, UUID } from 'crypto';
import { ChildChunk } from './child-chunk.entity';

export class ParentChunk {
  public readonly id: UUID;
  public readonly relatedDocumentId: UUID;
  public readonly relatedChunkId: UUID;
  public readonly content: string;
  public readonly children: ChildChunk[];
  public readonly createdAt: Date;
  public readonly updatedAt: Date;

  constructor(params: {
    id?: UUID;
    relatedDocumentId: UUID;
    relatedChunkId: UUID;
    content: string;
    children: ChildChunk[];
    createdAt?: Date;
    updatedAt?: Date;
  }) {
    this.id = params.id ?? randomUUID();
    this.relatedDocumentId = params.relatedDocumentId;
    this.relatedChunkId = params.relatedChunkId;
    this.content = params.content;
    this.children = params.children;
    this.createdAt = params.createdAt ?? new Date();
    this.updatedAt = params.updatedAt ?? new Date();
  }
}
