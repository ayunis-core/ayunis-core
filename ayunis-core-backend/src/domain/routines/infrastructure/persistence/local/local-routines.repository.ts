import type { TransactionalAdapterTypeOrm } from '@nestjs-cls/transactional-adapter-typeorm';
import { TransactionHost } from '@nestjs-cls/transactional';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { UUID } from 'crypto';
import type { EntityManager, QueryDeepPartialEntity } from 'typeorm';
import { Repository } from 'typeorm';
import {
  RoutinesRepository,
  type DueRoutine,
  type InterruptedRoutineRun,
  type RoutineDefinitionChanges,
} from 'src/domain/routines/application/ports/routines.repository';
import type { Routine } from 'src/domain/routines/domain/routine.entity';
import type { RoutineRunOutcome } from 'src/domain/routines/domain/routine-run-outcome';
import { RoutineRunStatus } from 'src/domain/routines/domain/routine-run-status.enum';
import type { RoutineScheduleChanges } from 'src/domain/routines/domain/routine-schedule';
import { ROUTINE_PAUSE_AFTER_FAILURES } from 'src/domain/routines/domain/routines.constants';
import { RoutineMapper } from './mappers/routine.mapper';
import { RoutineRecord } from './schema/routine.record';

@Injectable()
export class LocalRoutinesRepository extends RoutinesRepository {
  constructor(
    @InjectRepository(RoutineRecord)
    private readonly defaultRepo: Repository<RoutineRecord>,
    private readonly mapper: RoutineMapper,
    private readonly txHost: TransactionHost<TransactionalAdapterTypeOrm>,
  ) {
    super();
  }

  private get repo(): Repository<RoutineRecord> {
    const manager = this.txHost.tx as EntityManager | undefined;
    return manager?.getRepository(RoutineRecord) ?? this.defaultRepo;
  }

  async create(routine: Routine): Promise<Routine> {
    await this.repo.save(this.mapper.toRecord(routine));
    return (await this.findById(routine.userId, routine.id)) as Routine;
  }

  async findById(userId: UUID, id: UUID): Promise<Routine | null> {
    const record = await this.repo.findOne({ where: { id, userId } });
    return record ? this.mapper.toDomain(record) : null;
  }

  async findByIdForUpdate(userId: UUID, id: UUID): Promise<Routine | null> {
    const record = await this.repo.findOne({
      where: { id, userId },
      lock: { mode: 'pessimistic_write' },
    });
    return record ? this.mapper.toDomain(record) : null;
  }

  async findByIdForExecution(id: UUID): Promise<Routine | null> {
    const record = await this.repo.findOne({ where: { id } });
    return record ? this.mapper.toDomain(record) : null;
  }

  async findAllByUserId(userId: UUID): Promise<Routine[]> {
    const records = await this.repo.find({
      where: { userId },
      order: { createdAt: 'ASC', id: 'ASC' },
    });
    return records.map((record) => this.mapper.toDomain(record));
  }

  async findDue(now: Date, limit: number): Promise<DueRoutine[]> {
    const records = await this.repo
      .createQueryBuilder('routine')
      .select([
        'routine.id',
        'routine.userId',
        'routine.orgId',
        'routine.dailyTime',
        'routine.nextRunAt',
      ])
      .where('routine.enabled = true')
      .andWhere('routine.nextRunAt <= :now', { now })
      .orderBy('routine.nextRunAt', 'ASC')
      .addOrderBy('routine.id', 'ASC')
      .limit(limit)
      .getMany();
    return records.map((record) => ({
      id: record.id,
      userId: record.userId,
      orgId: record.orgId,
      dailyTime: record.dailyTime,
      nextRunAt: record.nextRunAt as Date,
    }));
  }

  async updateDefinition(
    userId: UUID,
    id: UUID,
    {
      mcpIntegrationIds,
      ...changes
    }: RoutineDefinitionChanges & RoutineScheduleChanges,
  ): Promise<Routine | null> {
    const set = Object.fromEntries(
      Object.entries(changes as Record<string, unknown>).filter(
        ([, value]) => value !== undefined,
      ),
    ) as QueryDeepPartialEntity<RoutineRecord>;
    // The integrations live in a join table; touching the row keeps updatedAt
    // current when they are the only change.
    if (mcpIntegrationIds !== undefined && Object.keys(set).length === 0) {
      set.updatedAt = () => 'CURRENT_TIMESTAMP';
    }
    if (Object.keys(set).length > 0) {
      const result = await this.repo
        .createQueryBuilder()
        .update(RoutineRecord)
        .set(set)
        .where('id = :id AND "userId" = :userId', { id, userId })
        .execute();
      if ((result.affected ?? 0) === 0) return null;
    }
    if (mcpIntegrationIds !== undefined) {
      const stored = await this.findById(userId, id);
      if (!stored) return null;
      await this.replaceMcpIntegrations(
        id,
        stored.mcpIntegrationIds,
        mcpIntegrationIds,
      );
    }
    return this.findById(userId, id);
  }

  private async replaceMcpIntegrations(
    id: UUID,
    stored: UUID[],
    desired: UUID[],
  ): Promise<void> {
    await this.repo
      .createQueryBuilder()
      .relation(RoutineRecord, 'mcpIntegrations')
      .of(id)
      .addAndRemove(
        desired.filter((integrationId) => !stored.includes(integrationId)),
        stored.filter((integrationId) => !desired.includes(integrationId)),
      );
  }

  async delete(userId: UUID, id: UUID): Promise<boolean> {
    const result = await this.repo.delete({ id, userId });
    return (result.affected ?? 0) > 0;
  }

  async moveNextRunAt(id: UUID, expected: Date, next: Date): Promise<boolean> {
    const result = await this.repo
      .createQueryBuilder()
      .update(RoutineRecord)
      .set({ nextRunAt: next })
      // Postgres keeps microseconds, a JS date only milliseconds.
      .where(
        `id = :id AND enabled = true AND date_trunc('milliseconds', "nextRunAt") = :expected`,
        { id, expected },
      )
      .execute();
    return (result.affected ?? 0) > 0;
  }

  async markRunQueued(id: UUID): Promise<boolean> {
    const result = await this.repo
      .createQueryBuilder()
      .update(RoutineRecord)
      .set({ lastRunStatus: RoutineRunStatus.QUEUED })
      .where('id = :id', { id })
      .andWhere(
        '("lastRunStatus" IS NULL OR "lastRunStatus" NOT IN (:...active))',
        { active: [RoutineRunStatus.QUEUED, RoutineRunStatus.RUNNING] },
      )
      .execute();
    return (result.affected ?? 0) > 0;
  }

  async setRunStatus(id: UUID, status: RoutineRunStatus | null): Promise<void> {
    await this.repo.update({ id }, { lastRunStatus: status });
  }

  async markRunStarted(
    id: UUID,
    startedAt: Date,
    options: { executionKey: string; onlyIfEnabled: boolean },
  ): Promise<boolean> {
    const query = this.repo
      .createQueryBuilder()
      .update(RoutineRecord)
      .set({
        lastRunStatus: RoutineRunStatus.RUNNING,
        lastRunStartedAt: startedAt,
        recentExecutionKeys: () =>
          `(ARRAY[CAST(:executionKey AS varchar)] || "recentExecutionKeys")[1:${RECENT_EXECUTION_KEYS}]`,
      })
      .where('id = :id', { id })
      .andWhere(
        'NOT (CAST(:executionKey AS varchar) = ANY("recentExecutionKeys"))',
        { executionKey: options.executionKey },
      );
    if (options.onlyIfEnabled) query.andWhere('enabled = true');
    const result = await query.execute();
    return (result.affected ?? 0) > 0;
  }

  async recordRunOutcome(
    id: UUID,
    outcome: RoutineRunOutcome,
    finishedAt: Date,
  ): Promise<{ paused: boolean }> {
    if (outcome.status === 'failed') {
      return this.recordFailedRun(id, outcome.failureReason, finishedAt);
    }
    await this.repo.update(
      { id },
      outcome.status === 'succeeded'
        ? {
            lastRunStatus: RoutineRunStatus.SUCCEEDED,
            lastRunAt: finishedAt,
            lastRunFailureReason: null,
            consecutiveFailureCount: 0,
          }
        : {
            lastRunStatus: RoutineRunStatus.SKIPPED,
            lastRunAt: finishedAt,
            lastRunFailureReason: outcome.reason,
          },
    );
    return { paused: false };
  }

  private async recordFailedRun(
    id: UUID,
    failureReason: string,
    finishedAt: Date,
  ): Promise<{ paused: boolean }> {
    const result = await this.repo
      .createQueryBuilder()
      .update(RoutineRecord)
      .set(failedRunChanges(failureReason, finishedAt))
      .where('id = :id', { id })
      .setParameters(failedRunParameters(finishedAt))
      .returning('"pausedAt"')
      .execute();
    const rows = result.raw as Pick<RoutineRecord, 'pausedAt'>[];
    return { paused: isPausedAt(rows[0]?.pausedAt, finishedAt) };
  }

  async failRunsStartedBefore(
    startedBefore: Date,
    failureReason: string,
    finishedAt: Date,
  ): Promise<InterruptedRoutineRun[]> {
    const result = await this.repo
      .createQueryBuilder()
      .update(RoutineRecord)
      .set(failedRunChanges(failureReason, finishedAt))
      .where('"lastRunStatus" = :running', {
        running: RoutineRunStatus.RUNNING,
      })
      .andWhere('"lastRunStartedAt" < :startedBefore', { startedBefore })
      .setParameters(failedRunParameters(finishedAt))
      .returning(['id', 'userId', 'orgId', 'name', 'pausedAt'])
      .execute();
    const rows = result.raw as Pick<
      RoutineRecord,
      'id' | 'userId' | 'orgId' | 'name' | 'pausedAt'
    >[];
    return rows.map(({ pausedAt, ...routine }) => ({
      routine,
      paused: isPausedAt(pausedAt, finishedAt),
    }));
  }
}

/**
 * How many execution requests a routine remembers as started. A job is
 * redelivered (stall, retry) within minutes, long before this many other runs
 * of the same routine could start, so its key is still there.
 */
const RECENT_EXECUTION_KEYS = 10;

/**
 * A failed run, counted; reaching the limit pauses an enabled routine (no
 * scheduled run until it is re-enabled). Every SET expression reads the row
 * as it was before the update, so the pause condition is evaluated once.
 */
const PAUSES = `enabled AND "consecutiveFailureCount" + 1 >= :pauseAfterFailures`;

function failedRunChanges(
  failureReason: string,
  finishedAt: Date,
): QueryDeepPartialEntity<RoutineRecord> {
  return {
    lastRunStatus: RoutineRunStatus.FAILED,
    lastRunAt: finishedAt,
    lastRunFailureReason: failureReason,
    consecutiveFailureCount: () => '"consecutiveFailureCount" + 1',
    enabled: () => `CASE WHEN ${PAUSES} THEN false ELSE enabled END`,
    nextRunAt: () => `CASE WHEN ${PAUSES} THEN NULL ELSE "nextRunAt" END`,
    pausedAt: () =>
      `CASE WHEN ${PAUSES} THEN CAST(:finishedAt AS timestamptz) ELSE "pausedAt" END`,
  };
}

/** Whether the failure recorded at `finishedAt` is the one that paused. */
function isPausedAt(
  pausedAt: Date | null | undefined,
  finishedAt: Date,
): boolean {
  return pausedAt?.getTime() === finishedAt.getTime();
}

function failedRunParameters(finishedAt: Date) {
  return { finishedAt, pauseAfterFailures: ROUTINE_PAUSE_AFTER_FAILURES };
}
