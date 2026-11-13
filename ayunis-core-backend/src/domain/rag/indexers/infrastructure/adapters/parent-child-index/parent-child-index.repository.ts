import type { TransactionalAdapterTypeOrm } from '@nestjs-cls/transactional-adapter-typeorm';
import type { EntityManager, EntityTarget, ObjectLiteral } from 'typeorm';
import type { QueryDeepPartialEntity } from 'typeorm/query-builder/QueryPartialEntity';
import { TransactionHost } from '@nestjs-cls/transactional';
import { Injectable, Logger } from '@nestjs/common';
import { ParentChunkRecord } from './infrastructure/persistence/schema/parent-chunk.record';
import { ChildChunkRecord } from './infrastructure/persistence/schema/child-chunk.record';
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

const INSERT_BATCH_ROWS = 500;

async function insertInBatches<T extends ObjectLiteral>(
  manager: EntityManager,
  target: EntityTarget<T>,
  rows: QueryDeepPartialEntity<T>[],
): Promise<void> {
  for (let start = 0; start < rows.length; start += INSERT_BATCH_ROWS) {
    await manager
      .createQueryBuilder()
      .insert()
      .into(target)
      .values(rows.slice(start, start + INSERT_BATCH_ROWS))
      // The driver writes vector columns itself; the record's listener would
      // only turn them into text one awaited call per row.
      .callListeners(false)
      .updateEntity(false)
      .execute();
  }
}

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

  private get manager(): EntityManager {
    const manager = this.txHost.tx as EntityManager | undefined;
    return manager ?? this.defaultParentChunkRepository.manager;
  }

  async save(parentChunk: ParentChunk) {
    const parentChunkRecord =
      this.parentChildIndexerMapper.toParentChunkRecord(parentChunk);
    await this.parentChunkRepository.save(parentChunkRecord);
  }

  // These rows are always new (the document's entries are deleted before it
  // is ingested again), so they are written with plain inserts: save() loads
  // what exists and diffs parents against children first, which took seconds
  // for a 660-page document where the inserts take a fraction of one
  // (AYC-1814). One transaction, so a failed batch leaves nothing of the
  // document behind; batched, because one statement carries at most 65535
  // parameters.
  async saveMany(parentChunks: ParentChunk[]) {
    if (parentChunks.length === 0) return;
    const parents = parentChunks.map((chunk) =>
      this.parentChildIndexerMapper.toParentChunkRecord(chunk),
    );
    const children = parents.flatMap((parent) => parent.children);
    await this.manager.transaction(async (manager) => {
      await insertInBatches(manager, ParentChunkRecord, parents);
      await insertInBatches(manager, ChildChunkRecord, children);
    });
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
