import { UUID, randomUUID } from 'crypto';
import { EmbeddingModel } from 'src/domain/embeddings/domain/embedding-model.entity';
import { SourceContent } from './source-content.entity';

export class SourceContentChunk {
  id?: UUID;
  sourceId: UUID;
  sourceContent: SourceContent;
  content: string;
  embedding: number[];
  embeddingModel: EmbeddingModel;
  createdAt: Date;
  updatedAt: Date;

  constructor(params: {
    id?: UUID;
    sourceId: UUID;
    sourceContent: SourceContent;
    content: string;
    embedding: number[];
    embeddingModel: EmbeddingModel;
    createdAt?: Date;
    updatedAt?: Date;
  }) {
    this.id = params.id ?? randomUUID();
    this.sourceId = params.sourceId;
    this.sourceContent = params.sourceContent;
    this.content = params.content;
    this.embedding = params.embedding;
    this.embeddingModel = params.embeddingModel;
    this.createdAt = params.createdAt ?? new Date();
    this.updatedAt = params.updatedAt ?? new Date();
  }
}
