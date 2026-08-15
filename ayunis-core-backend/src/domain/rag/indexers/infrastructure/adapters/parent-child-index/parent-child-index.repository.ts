import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
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
  constructor(
    @InjectPinoLogger(ParentChildIndexerRepository.name)
    private readonly logger: PinoLogger,
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

  async saveMany(parentChunks: ParentChunk[]) {
    if (parentChunks.length === 0) return;
    const records = parentChunks.map((chunk) =>
      this.parentChildIndexerMapper.toParentChunkRecord(chunk),
    );
    // Chunked insert: a large document's chunks in one statement can exceed
    // Postgres's 65535-parameter limit.
    await this.parentChunkRepository.save(records, { chunk: 500 });
  }

  async delete(relatedDocumentId: UUID) {
    await this.parentChunkRepository
      .createQueryBuilder()
      .delete()
      .from(ParentChunkRecord)
      .where('relatedDocumentId = :relatedDocumentId', { relatedDocumentId })
      .execute();
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
    if (queryVector.length === 0) {
      this.logger.warn('Empty query vector provided for vector search');
      return [];
    }

    this.logger.debug(
      { relatedDocumentId, queryVectorLength: queryVector.length },
      'Starting vector search',
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
    if (queryVector.length === 0) {
      this.logger.warn('Empty query vector provided for multi-document search');
      return [];
    }

    if (relatedDocumentIds.length === 0) {
      this.logger.warn('No document IDs provided for multi-document search');
      return [];
    }

    this.logger.debug(
      {
        documentCount: relatedDocumentIds.length,
        queryVectorLength: queryVector.length,
      },
      'Starting multi-document vector search',
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
        {
          queryVectorLength: queryVector.length,
          supportedDimensions: Object.keys(EMBEDDING_COLUMNS),
        },
        'Unsupported query vector dimension',
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
      this.logger.error(
        { err: error as Error, ...errorContext },
        'Error performing vector search',
      );
      throw new Error(
        `Vector search failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }
}
