import type { TransactionalAdapterTypeOrm } from '@nestjs-cls/transactional-adapter-typeorm';
import type { EntityManager } from 'typeorm';
import { TransactionHost } from '@nestjs-cls/transactional';
import { Injectable, Logger } from '@nestjs/common';
import { ParentChunkRecord } from './infrastructure/persistence/schema/parent-chunk.record';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { ParentChunk } from './domain/parent-chunk.entity';
import { UUID } from 'crypto';
import {
  ParentChildIndexerRepositoryPort,
  ScoredParentChunk,
} from './application/ports/parent-child-indexer-repository.port';
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
    private readonly defaultParentChunkRepository: Repository<ParentChunkRecord>,
    private readonly parentChildIndexerMapper: ParentChildIndexerMapper,
    private readonly txHost: TransactionHost<TransactionalAdapterTypeOrm>,
  ) {
    super();
  }

  private get parentChunkRepository(): Repository<ParentChunkRecord> {
    const manager = this.txHost.tx as EntityManager | undefined;
    return (
      manager?.getRepository(ParentChunkRecord) ??
      this.defaultParentChunkRepository
    );
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

  async findByDocumentIds(
    queryVector: number[],
    relatedDocumentIds: UUID[],
    limit?: number,
  ): Promise<ScoredParentChunk[]> {
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

    return this.vectorSearch(
      embeddingColumn,
      queryVector,
      relatedDocumentIds,
      limit,
    );
  }

  private async vectorSearch(
    embeddingColumn: string,
    queryVector: number[],
    relatedDocumentIds: UUID[],
    limit: number | undefined,
  ): Promise<ScoredParentChunk[]> {
    try {
      const distance = `${embeddingColumn} <=> :queryVector::vector`;
      const { entities, raw } = await this.parentChunkRepository
        .createQueryBuilder('parentChunk')
        .leftJoinAndSelect('parentChunk.children', 'children')
        .addSelect(distance, 'distance')
        .where('parentChunk.relatedDocumentId IN (:...documentIds)', {
          documentIds: relatedDocumentIds,
        })
        .andWhere(`${embeddingColumn} IS NOT NULL`)
        .orderBy(distance, 'ASC')
        .setParameter('queryVector', JSON.stringify(queryVector))
        .limit(limit ?? DEFAULT_LIMIT)
        .getRawAndEntities<{
          parentChunk_id: UUID;
          distance: number | string;
        }>();

      const bestDistances = this.bestDistanceByParentId(raw);
      return entities.map((entity) => ({
        parentChunk: this.parentChildIndexerMapper.toParentChunkEntity(entity),
        distance: bestDistances.get(entity.id) ?? Number.POSITIVE_INFINITY,
      }));
    } catch (error) {
      this.logger.error(
        {
          err: error as Error,
          queryVectorLength: queryVector.length,
          documentCount: relatedDocumentIds.length,
        },
        'Error performing vector search',
      );
      throw new Error(
        `Vector search failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        { cause: error },
      );
    }
  }

  private bestDistanceByParentId(
    rows: { parentChunk_id: UUID; distance: number | string }[],
  ): Map<UUID, number> {
    const bestDistances = new Map<UUID, number>();
    for (const row of rows) {
      // Rows arrive ordered by distance, so a parent's first row is its best.
      if (!bestDistances.has(row.parentChunk_id)) {
        bestDistances.set(row.parentChunk_id, Number(row.distance));
      }
    }
    return bestDistances;
  }
}
