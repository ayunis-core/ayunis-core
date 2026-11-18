import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { TransactionHost } from '@nestjs-cls/transactional';
import type { TransactionalAdapterTypeOrm } from '@nestjs-cls/transactional-adapter-typeorm';
import type { UUID } from 'crypto';
import { Repository, type EntityManager } from 'typeorm';
import {
  SourceReindexRepository,
  type SourceReindexTarget,
} from 'src/domain/sources/application/ports/source-reindex.repository';
import type { TextSourceContentChunk } from 'src/domain/sources/domain/source-content-chunk.entity';
import type { SourceProcessingErrorCode } from 'src/domain/sources/domain/source-processing-error-code.enum';
import { SourceStatus } from 'src/domain/sources/domain/source-status.enum';
import { SourceType } from 'src/domain/sources/domain/source-type.enum';
import { SourceContentChunkMapper } from './mappers/source-content-chunk.mapper';
import { SourceContentChunkRecord } from './schema/source-content-chunk.record';
import { TextSourceRecord } from './schema/source.record';
import { sourceOrgsQuery } from './local-source-reachability.queries';

type StatusUpdate = Partial<
  Pick<
    TextSourceRecord,
    | 'status'
    | 'embeddingModelId'
    | 'processingError'
    | 'processingErrorCode'
    | 'processingStartedAt'
  >
>;

@Injectable()
export class LocalSourceReindexRepository extends SourceReindexRepository {
  constructor(
    @InjectRepository(TextSourceRecord)
    private readonly defaultRepository: Repository<TextSourceRecord>,
    private readonly chunkMapper: SourceContentChunkMapper,
    private readonly txHost: TransactionHost<TransactionalAdapterTypeOrm>,
  ) {
    super();
  }

  private get manager(): EntityManager {
    const transactionManager = this.txHost.tx as EntityManager | undefined;
    return transactionManager ?? this.defaultRepository.manager;
  }

  async recordEmbeddingModel(
    sourceId: UUID,
    embeddingModelId: UUID | null,
  ): Promise<void> {
    await this.manager.update(
      TextSourceRecord,
      { id: sourceId },
      { embeddingModelId },
    );
  }

  async flagOrgSourcesForReindex(
    orgId: UUID,
    embeddingModelId: UUID,
  ): Promise<UUID[]> {
    // A source without a recorded model was indexed before models were
    // recorded (or never) and counts as indexed with another one, even when
    // the org re-adds the model it had before (AYC-1919).
    const [rows]: [{ id: UUID }[], number] = await this.manager.query(
      `UPDATE sources s
       SET status = $3, "processingStartedAt" = now(), "updatedAt" = now()
       WHERE s.type = $4
         AND s.id IN (
           SELECT o."sourceId" FROM (${sourceOrgsQuery(
             (_sourceId, sourceOrgId) => `${sourceOrgId} = $1`,
           )}) o
         )
         AND (
           s.status = $3
           OR (s.status = $5 AND s."embeddingModelId" IS DISTINCT FROM $2)
           OR (s.status = $6 AND EXISTS (
             SELECT 1 FROM text_source_details_record d
             JOIN source_content_chunks c ON c."sourceId" = d.id
             WHERE d."sourceId" = s.id
           ))
         )
       RETURNING s.id`,
      [
        orgId,
        embeddingModelId,
        SourceStatus.REINDEXING,
        SourceType.TEXT,
        SourceStatus.READY,
        SourceStatus.FAILED,
      ],
    );
    return rows.map((row) => row.id);
  }

  async flagIfIndexedWithOtherModel(
    sourceId: UUID,
    embeddingModelId: UUID,
  ): Promise<boolean> {
    const [, affected]: [unknown[], number] = await this.manager.query(
      `UPDATE sources
       SET status = $3, "processingStartedAt" = now(), "updatedAt" = now()
       WHERE id = $1 AND status = $4
         AND "embeddingModelId" IS DISTINCT FROM $2`,
      [sourceId, embeddingModelId, SourceStatus.REINDEXING, SourceStatus.READY],
    );
    return affected > 0;
  }

  async claimStaleReindexing(
    olderThanMs: number,
    limit: number,
  ): Promise<SourceReindexTarget[]> {
    const [claimed]: [{ id: UUID }[], number] = await this.manager.query(
      `UPDATE sources SET "processingStartedAt" = now()
       WHERE id IN (
         SELECT id FROM sources
         WHERE status = $1
           AND ("processingStartedAt" IS NULL
             OR "processingStartedAt" < now() - $2 * interval '1 millisecond')
         ORDER BY "processingStartedAt" ASC NULLS FIRST
         LIMIT $3
         FOR UPDATE SKIP LOCKED
       )
       RETURNING id`,
      [SourceStatus.REINDEXING, olderThanMs, limit],
    );
    if (claimed.length === 0) return [];
    return this.manager.query(
      `SELECT DISTINCT ON (o."sourceId") o."sourceId", o."orgId"
       FROM (${sourceOrgsQuery(
         (sourceId) => `${sourceId} = ANY($1::varchar[])`,
       )}) o`,
      [claimed.map((row) => row.id)],
    );
  }

  async lockReindexing(sourceId: UUID): Promise<boolean> {
    const rows: unknown[] = await this.manager.query(
      'SELECT 1 FROM sources WHERE id = $1 AND status = $2 FOR UPDATE',
      [sourceId, SourceStatus.REINDEXING],
    );
    return rows.length > 0;
  }

  isReindexing(sourceId: UUID): Promise<boolean> {
    return this.manager.exists(TextSourceRecord, {
      where: { id: sourceId, status: SourceStatus.REINDEXING },
    });
  }

  deferReindex(sourceId: UUID): Promise<boolean> {
    return this.updateReindexing(sourceId, { processingStartedAt: null });
  }

  async findContentChunks(sourceId: UUID): Promise<TextSourceContentChunk[]> {
    const records = await this.manager
      .getRepository(SourceContentChunkRecord)
      .createQueryBuilder('chunk')
      .innerJoin('chunk.source', 'details')
      .where('"details"."sourceId" = :sourceId', { sourceId })
      .orderBy('chunk.createdAt', 'ASC')
      .addOrderBy('chunk.id', 'ASC')
      .getMany();
    return records.map((record) => this.chunkMapper.toDomain(record));
  }

  completeReindex(sourceId: UUID, embeddingModelId: UUID): Promise<boolean> {
    return this.updateReindexing(sourceId, {
      status: SourceStatus.READY,
      embeddingModelId,
      processingError: null,
      processingErrorCode: null,
    });
  }

  releaseReindexing(sourceId: UUID): Promise<boolean> {
    return this.updateReindexing(sourceId, { status: SourceStatus.READY });
  }

  failReindex(
    sourceId: UUID,
    error: { message: string; code: SourceProcessingErrorCode },
  ): Promise<boolean> {
    return this.updateReindexing(sourceId, {
      status: SourceStatus.FAILED,
      embeddingModelId: null,
      processingError: error.message,
      processingErrorCode: error.code,
    });
  }

  private async updateReindexing(
    sourceId: UUID,
    update: StatusUpdate,
  ): Promise<boolean> {
    const result = await this.manager.update(
      TextSourceRecord,
      { id: sourceId, status: SourceStatus.REINDEXING },
      update,
    );
    return (result.affected ?? 0) > 0;
  }
}
