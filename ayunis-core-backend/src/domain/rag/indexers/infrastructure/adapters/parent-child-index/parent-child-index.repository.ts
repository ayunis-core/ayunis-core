import { Injectable, Logger } from '@nestjs/common';
import { ParentChunkRecord } from './infrastructure/persistence/schema/parent-chunk.record';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { ParentChunk } from './domain/parent-chunk.entity';
import { UUID } from 'crypto';
import { ParentChildIndexerRepositoryPort } from './application/ports/parent-child-indexer-repository.port';
import { ParentChildIndexerMapper } from './infrastructure/persistence/mappers/parent-child-indexer.mapper';

const DEFAULT_LIMIT = 10;
const EMBEDDING_COLUMNS: Record<number, string> = {
  1024: 'children.embedding_1024',
  1536: 'children.embedding_1536',
  2560: 'children.embedding_2560',
};

@Injectable()
export class ParentChildIndexerRepository extends ParentChildIndexerRepositoryPort {
  private readonly logger = new Logger(ParentChildIndexerRepository.name);
  constructor(
    @InjectRepository(ParentChunkRecord)
    private readonly parentChunkRepository: Repository<ParentChunkRecord>,
    private readonly parentChildIndexerMapper: ParentChildIndexerMapper,
  ) {
    super();
  }

  async save(parentChunk: ParentChunk) {
    const parentChunkRecord =
      this.parentChildIndexerMapper.toParentChunkRecord(parentChunk);
    await this.parentChunkRepository.save(parentChunkRecord);
  }

  async delete(relatedDocumentId: UUID) {
    const parentChunks = await this.parentChunkRepository.find({
      where: { relatedDocumentId },
    });
    if (parentChunks.length === 0) {
      return;
    }
    await this.parentChunkRepository.remove(parentChunks);
  }

  async deleteMany(relatedDocumentIds: UUID[]): Promise<void> {
    if (relatedDocumentIds.length === 0) {
      return;
    }
    await this.parentChunkRepository
      .createQueryBuilder()
      .delete()
      .from(ParentChunkRecord)
      .where('relatedDocumentId IN (:...ids)', { ids: relatedDocumentIds })
      .execute();
  }

  async find(
    queryVector: number[],
    relatedDocumentId: UUID,
    limit?: number,
  ): Promise<ParentChunk[]> {
    if (!queryVector || queryVector.length === 0) {
      this.logger.warn('Empty query vector provided for vector search');
      return [];
    }

    if (!relatedDocumentId) {
      this.logger.warn(
        'No relatedDocumentId provided in filter for vector search',
      );
      return [];
    }

    this.logger.debug(
      `Starting vector search for document ${relatedDocumentId} with vector of dimension ${queryVector.length}`,
    );

    return this.vectorSearch(
      queryVector,
      (qb) =>
        qb.where('parentChunk.relatedDocumentId = :relatedDocumentId', {
          relatedDocumentId,
        }),
      limit,
      { relatedDocumentId },
    );
  }

  async findByDocumentIds(
    queryVector: number[],
    relatedDocumentIds: UUID[],
    limit?: number,
  ): Promise<ParentChunk[]> {
    if (!queryVector || queryVector.length === 0) {
      this.logger.warn('Empty query vector provided for multi-document search');
      return [];
    }

    if (!relatedDocumentIds || relatedDocumentIds.length === 0) {
      this.logger.warn('No document IDs provided for multi-document search');
      return [];
    }

    this.logger.debug(
      `Starting multi-document vector search across ${relatedDocumentIds.length} documents with vector of dimension ${queryVector.length}`,
    );

    return this.vectorSearch(
      queryVector,
      (qb) =>
        qb.where('parentChunk.relatedDocumentId IN (:...documentIds)', {
          documentIds: relatedDocumentIds,
        }),
      limit,
      {
        queryVectorLength: queryVector.length,
        documentCount: relatedDocumentIds.length,
      },
    );
  }

  private async vectorSearch(
    queryVector: number[],
    applyWhereClause: (
      qb: SelectQueryBuilder<ParentChunkRecord>,
    ) => SelectQueryBuilder<ParentChunkRecord>,
    limit: number | undefined,
    errorContext: Record<string, unknown>,
  ): Promise<ParentChunk[]> {
    const embeddingColumn = EMBEDDING_COLUMNS[queryVector.length];
    if (!embeddingColumn) {
      this.logger.warn(
        `Unsupported query vector dimension ${queryVector.length}. Only ${Object.keys(EMBEDDING_COLUMNS).join(', ')} are supported.`,
      );
      return [];
    }

    try {
      const queryVectorString = JSON.stringify(queryVector);
      let queryBuilder = this.parentChunkRepository
        .createQueryBuilder('parentChunk')
        .leftJoinAndSelect('parentChunk.children', 'children');

      queryBuilder = applyWhereClause(queryBuilder);

      queryBuilder
        .andWhere(`${embeddingColumn} IS NOT NULL`)
        .orderBy(`${embeddingColumn} <=> :queryVector::vector`, 'ASC')
        .setParameter('queryVector', queryVectorString)
        .limit(limit ?? DEFAULT_LIMIT);

      const { entities } = await queryBuilder.getRawAndEntities();

      return entities.map((entity) =>
        this.parentChildIndexerMapper.toParentChunkEntity(entity),
      );
    } catch (error) {
      this.logger.error(`Error performing vector search:`, {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        ...errorContext,
      });
      throw new Error(
        `Vector search failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }
}
