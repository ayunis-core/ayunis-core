import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { TransactionHost } from '@nestjs-cls/transactional';
import type { TransactionalAdapterTypeOrm } from '@nestjs-cls/transactional-adapter-typeorm';
import { randomUUID, type UUID } from 'crypto';
import { In, Repository, type EntityManager } from 'typeorm';
import {
  RecordingSummaryRepository,
  type GeneratedRecordingSummary,
} from 'src/domain/recordings/application/ports/recording-summary.repository';
import type { RecordingSummaryFailure } from 'src/domain/recordings/domain/recording-summary-failure.enum';
import { RecordingSummaryStatus } from 'src/domain/recordings/domain/recording-summary-status.enum';
import type { RecordingSummary } from 'src/domain/recordings/domain/recording-summary.entity';
import { RecordingSummaryMapper } from './mappers/recording-summary.mapper';
import { RecordingSummaryRecord } from './schema/recording-summary.record';

const IN_PROGRESS = [
  RecordingSummaryStatus.PENDING,
  RecordingSummaryStatus.RUNNING,
];

@Injectable()
export class LocalRecordingSummaryRepository extends RecordingSummaryRepository {
  constructor(
    @InjectRepository(RecordingSummaryRecord)
    private readonly defaultRepository: Repository<RecordingSummaryRecord>,
    private readonly mapper: RecordingSummaryMapper,
    private readonly txHost: TransactionHost<TransactionalAdapterTypeOrm>,
  ) {
    super();
  }

  private get repository(): Repository<RecordingSummaryRecord> {
    const transactionManager = this.txHost.tx as EntityManager | undefined;
    return (
      transactionManager?.getRepository(RecordingSummaryRecord) ??
      this.defaultRepository
    );
  }

  async findByRecordingId(recordingId: UUID): Promise<RecordingSummary | null> {
    const record = await this.repository.findOne({ where: { recordingId } });
    return record ? this.mapper.toDomain(record) : null;
  }

  async findByRecordingIds(
    recordingIds: UUID[],
  ): Promise<Map<UUID, RecordingSummary>> {
    if (recordingIds.length === 0) return new Map();
    const records = await this.repository.find({
      select: {
        recordingId: true,
        runId: true,
        status: true,
        triggeredByUserId: true,
        modelId: true,
        modelName: true,
        generatedAt: true,
        failure: true,
      },
      where: { recordingId: In(recordingIds) },
    });
    return new Map(
      records.map((record) => [
        record.recordingId,
        this.mapper.toDomain(record),
      ]),
    );
  }

  async createPending(
    recordingId: UUID,
    runId: UUID,
    triggeredByUserId: UUID,
  ): Promise<void> {
    await this.repository
      .createQueryBuilder()
      .insert()
      .into(RecordingSummaryRecord)
      .values({
        id: randomUUID(),
        recordingId,
        runId,
        status: RecordingSummaryStatus.PENDING,
        triggeredByUserId,
      })
      .orIgnore()
      .execute();
  }

  async findPendingForAudio(
    audioSourceId: UUID,
  ): Promise<RecordingSummary | null> {
    const record = await this.repository
      .createQueryBuilder('summary')
      .innerJoin(
        'sources',
        'audio',
        'audio."recordingId" = summary."recordingId"',
      )
      .where('audio.id = :audioSourceId', { audioSourceId })
      .andWhere('summary.status = :status', {
        status: RecordingSummaryStatus.PENDING,
      })
      .getOne();
    return record ? this.mapper.toDomain(record) : null;
  }

  restartFailed(
    recordingId: UUID,
    runId: UUID,
    triggeredByUserId: UUID,
  ): Promise<RecordingSummary | null> {
    return this.updateReturning(
      {
        status: RecordingSummaryStatus.PENDING,
        runId,
        triggeredByUserId,
        failure: null,
      },
      { recordingId, statuses: [RecordingSummaryStatus.FAILED] },
    );
  }

  claim(recordingId: UUID, runId: UUID): Promise<RecordingSummary | null> {
    // A run left running by a worker that died is claimed again on redelivery.
    return this.updateReturning(
      { status: RecordingSummaryStatus.RUNNING },
      { recordingId, runId, statuses: IN_PROGRESS },
    );
  }

  async saveContent(
    recordingId: UUID,
    runId: UUID,
    generated: GeneratedRecordingSummary,
  ): Promise<boolean> {
    return (
      (await this.updateReturning(generated, {
        recordingId,
        runId,
        statuses: [RecordingSummaryStatus.RUNNING],
      })) !== null
    );
  }

  async markReady(recordingId: UUID, runId: UUID): Promise<boolean> {
    return (
      (await this.updateReturning(
        { status: RecordingSummaryStatus.READY },
        {
          recordingId,
          runId,
          statuses: [RecordingSummaryStatus.RUNNING],
          withContent: true,
        },
      )) !== null
    );
  }

  async markFailed(
    recordingId: UUID,
    runId: UUID,
    failure: RecordingSummaryFailure,
  ): Promise<boolean> {
    return (
      (await this.updateReturning(
        { status: RecordingSummaryStatus.FAILED, failure },
        { recordingId, runId, statuses: IN_PROGRESS },
      )) !== null
    );
  }

  private async updateReturning(
    values: Partial<RecordingSummaryRecord>,
    where: {
      recordingId: UUID;
      runId?: UUID;
      statuses: RecordingSummaryStatus[];
      withContent?: boolean;
    },
  ): Promise<RecordingSummary | null> {
    const query = this.repository
      .createQueryBuilder()
      .update(RecordingSummaryRecord)
      .set(values)
      .where('"recordingId" = :recordingId', { recordingId: where.recordingId })
      .andWhere('status IN (:...statuses)', { statuses: where.statuses });
    if (where.runId) query.andWhere('"runId" = :runId', { runId: where.runId });
    if (where.withContent) query.andWhere('content IS NOT NULL');
    const result = await query.returning('*').execute();
    const rows = result.raw as RecordingSummaryRecord[];
    return rows.length > 0 ? this.mapper.toDomain(rows[0]) : null;
  }
}
