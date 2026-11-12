import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { TransactionHost } from '@nestjs-cls/transactional';
import type { TransactionalAdapterTypeOrm } from '@nestjs-cls/transactional-adapter-typeorm';
import type { UUID } from 'crypto';
import {
  Brackets,
  In,
  QueryFailedError,
  Repository,
  type EntityManager,
} from 'typeorm';
import type { RecordingAudio } from 'src/domain/recordings/application/models/recording-audio';
import type {
  SearchableRecording,
  SearchableRecordingFilter,
} from 'src/domain/recordings/application/models/recording-search';
import { SourceStatus } from 'src/domain/sources/domain/source-status.enum';
import { SourceRecord } from 'src/domain/sources/infrastructure/persistence/local/schema/source.record';
import { whereCollectiveOwner } from 'src/domain/ownership/infrastructure/persistence/collective-owner.db-query';
import { RecordingRepository } from 'src/domain/recordings/application/ports/recording.repository';
import type { Recording } from 'src/domain/recordings/domain/recording';
import { WorkspaceRecording } from 'src/domain/recordings/domain/workspace-recording.entity';
import type { ReadableCollectiveOwners } from 'src/iam/teams/application/models/collective-owner.model';
import { RecordingMapper } from './mappers/recording.mapper';
import { RecordingRecord } from './schema/recording.record';

@Injectable()
export class LocalRecordingRepository extends RecordingRepository {
  constructor(
    @InjectRepository(RecordingRecord)
    private readonly defaultRepository: Repository<RecordingRecord>,
    private readonly mapper: RecordingMapper,
    private readonly txHost: TransactionHost<TransactionalAdapterTypeOrm>,
    @InjectRepository(SourceRecord)
    private readonly defaultSourceRepository: Repository<SourceRecord>,
  ) {
    super();
  }

  private get sources(): Repository<SourceRecord> {
    const transactionManager = this.txHost.tx as EntityManager | undefined;
    return (
      transactionManager?.getRepository(SourceRecord) ??
      this.defaultSourceRepository
    );
  }

  private get repository(): Repository<RecordingRecord> {
    const transactionManager = this.txHost.tx as EntityManager | undefined;
    return (
      transactionManager?.getRepository(RecordingRecord) ??
      this.defaultRepository
    );
  }

  async findById(
    id: UUID,
    options?: { lock?: boolean },
  ): Promise<Recording | null> {
    const record = await this.repository.findOne({
      where: { id },
      ...(options?.lock
        ? { lock: { mode: 'pessimistic_write' as const } }
        : {}),
    });
    return record ? this.mapper.toDomain(record) : null;
  }

  async findAllReadable(
    userId: UUID,
    collectiveOwners: ReadableCollectiveOwners,
  ): Promise<Recording[]> {
    const records = await this.repository
      .createQueryBuilder('recording')
      .where(
        new Brackets((owner) =>
          owner
            .where(
              new Brackets((personal) =>
                personal
                  .where('recording.userId = :userId', { userId })
                  .andWhere('recording.orgId = :orgId', {
                    orgId: collectiveOwners.orgId,
                  }),
              ),
            )
            .orWhere(
              new Brackets((collective) =>
                whereCollectiveOwner(collective, 'recording', collectiveOwners),
              ),
            ),
        ),
      )
      .orderBy('LOWER(recording.name)', 'ASC')
      .addOrderBy('recording.id', 'ASC')
      .getMany();
    return records.map((record) => this.mapper.toDomain(record));
  }

  async findSearchable({
    userId,
    owners,
    workspaceId,
    uploaded,
  }: SearchableRecordingFilter): Promise<SearchableRecording[]> {
    const query = this.repository
      .createQueryBuilder('recording')
      // The audio turns ready once its transcript is indexed.
      .innerJoin(
        SourceRecord,
        'audio',
        'audio.recordingId = recording.id AND audio.status = :ready',
        { ready: SourceStatus.READY },
      )
      .select('recording.id', 'id')
      .addSelect('recording.name', 'name')
      .addSelect('recording.createdAt', 'uploadedAt')
      .addSelect('audio.id', 'audioSourceId')
      .where('recording.orgId = :orgId', { orgId: owners.orgId })
      .andWhere(
        new Brackets((owner) => {
          owner
            .where('recording.userId = :userId', { userId })
            .orWhere(
              new Brackets((collective) =>
                whereCollectiveOwner(collective, 'recording', owners),
              ),
            );
          if (workspaceId) {
            owner.orWhere('recording.workspaceId = :workspaceId', {
              workspaceId,
            });
          }
        }),
      );
    if (uploaded.from) {
      query.andWhere('recording.createdAt >= :uploadedFrom', {
        uploadedFrom: uploaded.from,
      });
    }
    if (uploaded.to) {
      query.andWhere('recording.createdAt <= :uploadedTo', {
        uploadedTo: uploaded.to,
      });
    }
    return query.getRawMany<SearchableRecording>();
  }

  async findAllByWorkspaceId(workspaceId: UUID): Promise<WorkspaceRecording[]> {
    const records = await this.repository
      .createQueryBuilder('recording')
      .where('recording.workspaceId = :workspaceId', { workspaceId })
      .orderBy('LOWER(recording.name)', 'ASC')
      .addOrderBy('recording.id', 'ASC')
      .getMany();
    return records.map((record) => {
      const recording = this.mapper.toDomain(record);
      if (!(recording instanceof WorkspaceRecording)) {
        throw new Error(`Expected workspace recording ${record.id}`);
      }
      return recording;
    });
  }

  async findAllByTeamId(teamId: UUID): Promise<Recording[]> {
    const records = await this.repository.find({ where: { teamId } });
    return records.map((record) => this.mapper.toDomain(record));
  }

  async findAllByOrgId(orgId: UUID): Promise<Recording[]> {
    const records = await this.repository.find({ where: { orgId } });
    return records.map((record) => this.mapper.toDomain(record));
  }

  async findAllDeletedWithUser(userId: UUID): Promise<Recording[]> {
    const records = await this.repository
      .createQueryBuilder('recording')
      .leftJoin('recording.workspace', 'workspace')
      .where('recording.userId = :userId', { userId })
      .orWhere('workspace.userId = :userId', { userId })
      .getMany();
    return records.map((record) => this.mapper.toDomain(record));
  }

  async save(recording: Recording): Promise<Recording> {
    const saved = await this.repository.save(this.mapper.toRecord(recording));
    return this.mapper.toDomain(saved);
  }

  async findAudio(recordingIds: UUID[]): Promise<Map<UUID, RecordingAudio>> {
    const audio = new Map<UUID, RecordingAudio>();
    if (recordingIds.length === 0) return audio;
    const records = await this.sources.find({
      where: { recordingId: In(recordingIds) },
    });
    for (const record of records) {
      if (!record.recordingId) continue;
      audio.set(record.recordingId, {
        sourceId: record.id,
        fileName: record.name,
        storageKey: record.storageKey,
        sourceStatus: record.status,
        failureCode: record.processingErrorCode,
      });
    }
    return audio;
  }

  async attachAudio(recordingId: UUID, sourceId: UUID): Promise<boolean> {
    try {
      const result = await this.sources
        .createQueryBuilder()
        .update(SourceRecord)
        .set({ recordingId })
        .where('id = :sourceId', { sourceId })
        .andWhere(
          'NOT EXISTS (SELECT 1 FROM sources audio WHERE audio."recordingId" = :recordingId)',
          { recordingId },
        )
        .execute();
      return result.affected === 1;
    } catch (error) {
      // Two uploads completing at once: the unique index keeps the first.
      if (isUniqueViolation(error)) return false;
      throw error;
    }
  }

  async delete(recording: Recording): Promise<void> {
    await this.repository.delete({ id: recording.id });
  }
}

function isUniqueViolation(error: unknown): boolean {
  if (!(error instanceof QueryFailedError)) return false;
  const driverError: unknown = error.driverError;
  return (driverError as { code?: string } | undefined)?.code === '23505';
}
