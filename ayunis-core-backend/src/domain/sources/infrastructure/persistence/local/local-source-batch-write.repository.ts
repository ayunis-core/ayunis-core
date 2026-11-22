import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { TransactionHost } from '@nestjs-cls/transactional';
import { TransactionalAdapterTypeOrm } from '@nestjs-cls/transactional-adapter-typeorm';
import type { UUID } from 'crypto';
import { EntityManager, Repository } from 'typeorm';
import {
  SourceBatchWriteRepository,
  type ReplacedSource,
} from 'src/domain/sources/application/ports/source-batch-write.repository';
import { SourceStatus } from 'src/domain/sources/domain/source-status.enum';
import type { FileSource } from 'src/domain/sources/domain/sources/text-source.entity';
import { insertCrawledFileSources } from './crawled-file-sources.helpers';
import { SourceRecord, TextSourceRecord } from './schema/source.record';
import { FileSourceDetailsRecord } from './schema/text-source-details.record';

@Injectable()
export class LocalSourceBatchWriteRepository extends SourceBatchWriteRepository {
  constructor(
    @InjectRepository(SourceRecord)
    private readonly sources: Repository<SourceRecord>,
    private readonly txHost: TransactionHost<TransactionalAdapterTypeOrm>,
  ) {
    super();
  }

  private get manager(): EntityManager {
    // Background callers can run without an active CLS context.
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    return this.txHost.tx ?? this.sources.manager;
  }

  async insertFileSources(files: FileSource[]): Promise<void> {
    if (files.length === 0) return;
    await insertCrawledFileSources(this.manager, files);
  }

  async rename(renames: { sourceId: UUID; name: string }[]): Promise<void> {
    if (renames.length === 0) return;
    const values = renames.map(
      (_, index) => `($${index * 2 + 1}::varchar, $${index * 2 + 2}::varchar)`,
    );
    await this.manager.query(
      `UPDATE "sources" AS s SET "name" = v.name, "updatedAt" = now()
       FROM (VALUES ${values.join(', ')}) AS v(id, name)
       WHERE s.id = v.id`,
      renames.flatMap(({ sourceId, name }) => [sourceId, name]),
    );
  }

  async lock(sourceIds: UUID[]): Promise<UUID[]> {
    if (sourceIds.length === 0) return [];
    const rows = await this.manager.query<{ id: UUID }[]>(
      `SELECT id FROM "sources" WHERE id = ANY($1) ORDER BY id FOR UPDATE`,
      [sourceIds],
    );
    return rows.map(({ id }) => id);
  }

  async insertReplacement(
    replacement: FileSource,
    replacedId: UUID,
  ): Promise<void> {
    await this.manager.getRepository(TextSourceRecord).insert({
      id: replacement.id,
      name: replacement.name,
      createdBy: replacement.createdBy,
      status: replacement.status,
      processingStartedAt: replacement.processingStartedAt,
      storageKey: replacement.storageKey,
      knowledgeBaseId: null,
      replacesSourceId: replacedId,
      textType: replacement.textType,
      fileType: replacement.fileType,
      url: replacement.url,
    });
    await this.manager.getRepository(FileSourceDetailsRecord).insert({
      id: replacement.id,
      fileType: replacement.fileType,
      source: { id: replacement.id },
      text: '',
    });
  }

  async findReplacementIds(replacedId: UUID): Promise<UUID[]> {
    const rows = await this.manager.getRepository(SourceRecord).find({
      select: { id: true },
      where: { replacesSourceId: replacedId },
    });
    return rows.map(({ id }) => id);
  }

  async pauseProcessing(sourceId: UUID): Promise<void> {
    await this.manager
      .createQueryBuilder()
      .update(SourceRecord)
      .set({ processingStartedAt: null })
      .where('id = :sourceId AND status = :status', {
        sourceId,
        status: SourceStatus.PROCESSING,
      })
      .execute();
  }

  async moveReplacementIn(
    replacementId: UUID,
    name: string,
  ): Promise<ReplacedSource | null> {
    const [rows]: [ReplacedSource[], number] = await this.manager.query(
      `UPDATE "sources" AS r
       SET "knowledgeBaseId" = o."knowledgeBaseId", "replacesSourceId" = NULL,
           "syncedLocationId" = o."syncedLocationId",
           "name" = $2, "updatedAt" = now()
       FROM "sources" AS o
       WHERE r.id = $1 AND o.id = r."replacesSourceId"
         AND (r.status IN ($3, $4) OR (r.status = $5 AND o.status NOT IN ($3, $4)))
       RETURNING o.id AS "id", o."storageKey" AS "storageKey"`,
      [
        replacementId,
        name,
        SourceStatus.READY,
        SourceStatus.REINDEXING,
        SourceStatus.FAILED,
      ],
    );
    return rows.at(0) ?? null;
  }
}
