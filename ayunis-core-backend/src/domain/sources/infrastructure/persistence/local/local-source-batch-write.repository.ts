import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { TransactionHost } from '@nestjs-cls/transactional';
import { TransactionalAdapterTypeOrm } from '@nestjs-cls/transactional-adapter-typeorm';
import type { UUID } from 'crypto';
import { EntityManager, Repository } from 'typeorm';
import { SourceBatchWriteRepository } from 'src/domain/sources/application/ports/source-batch-write.repository';
import type { FileSource } from 'src/domain/sources/domain/sources/text-source.entity';
import { insertCrawledFileSources } from './crawled-file-sources.helpers';
import { SourceRecord } from './schema/source.record';

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

  async lock(sourceIds: UUID[]): Promise<void> {
    if (sourceIds.length === 0) return;
    await this.manager.query(
      `SELECT 1 FROM "sources" WHERE id = ANY($1) ORDER BY id FOR UPDATE`,
      [sourceIds],
    );
  }
}
