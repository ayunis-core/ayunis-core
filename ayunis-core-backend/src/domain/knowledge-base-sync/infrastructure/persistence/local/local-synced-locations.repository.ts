import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { TransactionHost } from '@nestjs-cls/transactional';
import { TransactionalAdapterTypeOrm } from '@nestjs-cls/transactional-adapter-typeorm';
import type { UUID } from 'crypto';
import { EntityManager, In, IsNull, Not, Repository } from 'typeorm';
import { SyncedLocationsRepository } from 'src/domain/knowledge-base-sync/application/ports/synced-locations.repository';
import type { SyncedFile } from 'src/domain/knowledge-base-sync/domain/synced-file.entity';
import type { SyncedLocation } from 'src/domain/knowledge-base-sync/domain/synced-location.entity';
import { SyncedFileSkipReason } from 'src/domain/knowledge-base-sync/domain/synced-file-skip-reason.enum';
import { SyncedFileState } from 'src/domain/knowledge-base-sync/domain/synced-file-state.enum';
import { SyncedLocationState } from 'src/domain/knowledge-base-sync/domain/synced-location-state.enum';
import { SyncedFileMapper } from './mappers/synced-file.mapper';
import { SyncedLocationMapper } from './mappers/synced-location.mapper';
import { SyncedFileRecord } from './schema/synced-file.record';
import { SyncedLocationRecord } from './schema/synced-location.record';

// Each row binds 13 parameters; this keeps a batch far below Postgres' cap.
const FILE_BATCH_SIZE = 1000;

@Injectable()
export class LocalSyncedLocationsRepository extends SyncedLocationsRepository {
  constructor(
    @InjectRepository(SyncedLocationRecord)
    private readonly defaultLocations: Repository<SyncedLocationRecord>,
    private readonly locationMapper: SyncedLocationMapper,
    private readonly fileMapper: SyncedFileMapper,
    private readonly txHost: TransactionHost<TransactionalAdapterTypeOrm>,
  ) {
    super();
  }

  private get manager(): EntityManager {
    // Sync jobs can run without an active CLS context.
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    return this.txHost.tx ?? this.defaultLocations.manager;
  }

  private get locations(): Repository<SyncedLocationRecord> {
    return this.manager.getRepository(SyncedLocationRecord);
  }

  private get files(): Repository<SyncedFileRecord> {
    return this.manager.getRepository(SyncedFileRecord);
  }

  async create(location: SyncedLocation): Promise<boolean> {
    const result = await this.locations
      .createQueryBuilder()
      .insert()
      .values(this.locationMapper.toInsertRow(location))
      .orIgnore()
      .returning(['id'])
      .execute();
    return (result.raw as unknown[]).length > 0;
  }

  async findById(id: UUID): Promise<SyncedLocation | null> {
    const record = await this.locations.findOne({ where: { id } });
    return record ? this.locationMapper.toDomain(record) : null;
  }

  async lockById(id: UUID): Promise<SyncedLocation | null> {
    const record = await this.locations.findOne({
      where: { id },
      lock: { mode: 'pessimistic_write' },
    });
    return record ? this.locationMapper.toDomain(record) : null;
  }

  async markNoLongerAccessible(
    id: UUID,
    lastSyncedAt: Date | null,
  ): Promise<void> {
    await this.locations
      .createQueryBuilder()
      .update()
      .set({ state: SyncedLocationState.NO_LONGER_ACCESSIBLE })
      .where({ id })
      .andWhere('"lastSyncedAt" IS NOT DISTINCT FROM :lastSyncedAt', {
        lastSyncedAt,
      })
      .execute();
  }

  async recordSync(id: UUID, cursor: string, syncedAt: Date): Promise<void> {
    await this.locations.update(id, {
      cursor,
      lastSyncedAt: syncedAt,
      state: SyncedLocationState.ACTIVE,
    });
  }

  async recordSyncStarted(id: UUID, startedAt: Date): Promise<void> {
    await this.locations
      .createQueryBuilder()
      .update()
      .set({ syncingSince: () => 'COALESCE("syncingSince", :startedAt)' })
      .where({ id })
      .setParameters({ startedAt })
      .execute();
  }

  async recordSyncEnded(id: UUID, nextSyncAt: Date): Promise<void> {
    await this.locations.update(id, { syncingSince: null, nextSyncAt });
  }

  async pause(id: UUID, until: Date): Promise<void> {
    await this.locations
      .createQueryBuilder()
      .update()
      // GREATEST ignores a NULL.
      .set({ pausedUntil: () => 'GREATEST("pausedUntil", :until)' })
      .where({ id })
      .setParameters({ until })
      .execute();
  }

  async claimDue(
    now: Date,
    next: Date,
    limit: number,
  ): Promise<Pick<SyncedLocation, 'id' | 'orgId'>[]> {
    const due = this.locations
      .createQueryBuilder('due')
      .select('due.id')
      .where('due."nextSyncAt" <= :now')
      .andWhere('(due."pausedUntil" IS NULL OR due."pausedUntil" <= :now)')
      .orderBy('due."nextSyncAt"', 'ASC')
      .limit(limit)
      // A location locked by its running sync is taken by a later call.
      .setLock('pessimistic_write')
      .setOnLocked('skip_locked');
    const result = await this.locations
      .createQueryBuilder()
      .update()
      .set({ nextSyncAt: next })
      .where(`id IN (${due.getQuery()})`)
      .setParameters({ now })
      .returning(['id', 'orgId'])
      .execute();
    return result.raw as Pick<SyncedLocation, 'id' | 'orgId'>[];
  }

  async delete(id: UUID): Promise<void> {
    await this.locations.delete(id);
  }

  async findFileSourceIds(locationId: UUID): Promise<UUID[]> {
    const records = await this.files.find({
      select: { sourceId: true },
      where: { locationId, sourceId: Not(IsNull()) },
    });
    return records.flatMap(({ sourceId }) => (sourceId ? [sourceId] : []));
  }

  async lockFiles(locationId: UUID): Promise<SyncedFile[]> {
    const records = await this.files.find({
      where: { locationId },
      lock: { mode: 'pessimistic_write' },
    });
    return records.map((record) => this.fileMapper.toDomain(record));
  }

  async findFileById(id: UUID): Promise<SyncedFile | null> {
    const record = await this.files.findOne({ where: { id } });
    return record ? this.fileMapper.toDomain(record) : null;
  }

  async findFilesToProcess(
    locationId: UUID,
    afterFileId: UUID | null,
    limit: number,
  ): Promise<SyncedFile[]> {
    const query = this.files
      .createQueryBuilder('file')
      .where({ locationId, sourceId: Not(IsNull()) })
      .andWhere('file."documentVersion" IS DISTINCT FROM file."version"')
      .orderBy('file.id', 'ASC')
      .limit(limit);
    if (afterFileId) query.andWhere('file.id > :afterFileId', { afterFileId });
    const records = await query.getMany();
    return records.map((record) => this.fileMapper.toDomain(record));
  }

  async lockFile(id: UUID): Promise<SyncedFile | null> {
    const record = await this.files.findOne({
      where: { id },
      lock: { mode: 'pessimistic_write' },
    });
    return record ? this.fileMapper.toDomain(record) : null;
  }

  async skipRemovedAfterFailure(sourceIds: UUID[]): Promise<void> {
    if (sourceIds.length === 0) return;
    await this.files
      .createQueryBuilder()
      .update()
      .set({
        state: SyncedFileState.SKIPPED,
        skipReason: SyncedFileSkipReason.REMOVED_AFTER_FAILURE,
        documentVersion: null,
        processingErrorCode: null,
      })
      .where({
        lastSourceId: In(sourceIds),
        sourceId: IsNull(),
        state: SyncedFileState.IMPORTED,
      })
      // The removed document failed at the current version; a newer one
      // still to be processed is imported again instead.
      .andWhere('"documentVersion" = "version"')
      .execute();
  }

  async saveFiles(files: SyncedFile[]): Promise<void> {
    for (let start = 0; start < files.length; start += FILE_BATCH_SIZE) {
      await this.files
        .createQueryBuilder()
        .insert()
        .values(
          files
            .slice(start, start + FILE_BATCH_SIZE)
            .map((file) => this.fileMapper.toRow(file)),
        )
        .orUpdate(
          [
            'name',
            'path',
            'version',
            'size',
            'state',
            'skipReason',
            'sourceId',
            'lastSourceId',
            'documentVersion',
            'processingErrorCode',
            'updatedAt',
          ],
          ['id'],
        )
        .execute();
    }
  }

  async deleteFiles(fileIds: UUID[]): Promise<void> {
    for (let start = 0; start < fileIds.length; start += FILE_BATCH_SIZE) {
      await this.files.delete({
        id: In(fileIds.slice(start, start + FILE_BATCH_SIZE)),
      });
    }
  }
}
