import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { TransactionHost } from '@nestjs-cls/transactional';
import type { TransactionalAdapterTypeOrm } from '@nestjs-cls/transactional-adapter-typeorm';
import type { UUID } from 'crypto';
import { Brackets, Repository, type EntityManager } from 'typeorm';
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
  ) {
    super();
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

  async delete(recording: Recording): Promise<void> {
    await this.repository.delete({ id: recording.id });
  }
}
