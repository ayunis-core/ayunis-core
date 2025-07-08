import { Injectable } from '@nestjs/common';
import { EmbeddingModel } from 'src/domain/embeddings/domain/embedding-model.entity';
import { SourceContentChunk } from 'src/domain/sources/domain/source-content-chunk.entity';
import { SourceContentChunkRecord } from '../schema/source-content-chunk.record';
import { SourceContentMapper } from './source-content.mapper';

@Injectable()
export class SourceContentChunkMapper {
  constructor(private readonly sourceContentMapper: SourceContentMapper) {}

  toDomain(entity: SourceContentChunkRecord): SourceContentChunk {
    return new SourceContentChunk({
      id: entity.id,
      sourceId: entity.sourceId,
      sourceContent: this.sourceContentMapper.toDomain(entity.sourceContent),
      content: entity.chunkContent,
      embedding: Array.isArray(entity.vector)
        ? entity.vector
        : (JSON.parse(entity.vector) as number[]), // Handle both array and string format
      embeddingModel: new EmbeddingModel(
        entity.embeddingModel,
        entity.embeddingProvider,
        entity.embeddingDimension,
      ),
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    });
  }

  toEntity(domain: SourceContentChunk): SourceContentChunkRecord {
    const entity = new SourceContentChunkRecord();
    entity.id = domain.id!;
    entity.sourceId = domain.sourceId;
    entity.sourceContent = this.sourceContentMapper.toEntity(
      domain.sourceContent,
    );
    entity.chunkContent = domain.content;
    entity.vector = domain.embedding;
    entity.embeddingModel = domain.embeddingModel.name;
    entity.embeddingProvider = domain.embeddingModel.provider;
    entity.embeddingDimension = domain.embeddingModel.dimensions;
    entity.createdAt = domain.createdAt;
    entity.updatedAt = domain.updatedAt;
    return entity;
  }
}
