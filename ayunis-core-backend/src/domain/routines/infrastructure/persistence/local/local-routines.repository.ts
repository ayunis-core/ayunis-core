import type { TransactionalAdapterTypeOrm } from '@nestjs-cls/transactional-adapter-typeorm';
import { TransactionHost } from '@nestjs-cls/transactional';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { UUID } from 'crypto';
import type { EntityManager, QueryDeepPartialEntity } from 'typeorm';
import { Repository } from 'typeorm';
import {
  RoutinesRepository,
  type RoutineDefinitionChanges,
} from 'src/domain/routines/application/ports/routines.repository';
import type { Routine } from 'src/domain/routines/domain/routine.entity';
import type { RoutineRunOutcome } from 'src/domain/routines/domain/routine-run-outcome';
import { RoutineRunStatus } from 'src/domain/routines/domain/routine-run-status.enum';
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
    const saved = await this.repo.save(this.mapper.toRecord(routine));
    return this.mapper.toDomain(saved);
  }

  async findById(userId: UUID, id: UUID): Promise<Routine | null> {
    const record = await this.repo.findOne({ where: { id, userId } });
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

  async updateDefinition(
    userId: UUID,
    id: UUID,
    changes: RoutineDefinitionChanges,
  ): Promise<Routine | null> {
    const set = Object.fromEntries(
      Object.entries(changes).filter(([, value]) => value !== undefined),
    ) as QueryDeepPartialEntity<RoutineRecord>;
    if (Object.keys(set).length === 0) return this.findById(userId, id);
    const result = await this.repo
      .createQueryBuilder()
      .update(RoutineRecord)
      .set(set)
      .where('id = :id AND "userId" = :userId', { id, userId })
      .returning('*')
      .execute();
    const rows = result.raw as RoutineRecord[];
    return rows.length > 0 ? this.mapper.toDomain(rows[0]) : null;
  }

  async delete(userId: UUID, id: UUID): Promise<boolean> {
    const result = await this.repo.delete({ id, userId });
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

  async recordRunOutcome(
    id: UUID,
    outcome: RoutineRunOutcome,
    finishedAt: Date,
  ): Promise<void> {
    const failed = outcome.status === 'failed';
    await this.repo.update(
      { id },
      {
        lastRunStatus: failed
          ? RoutineRunStatus.FAILED
          : RoutineRunStatus.SUCCEEDED,
        lastRunAt: finishedAt,
        lastRunFailureReason: failed ? outcome.failureReason : null,
        consecutiveFailureCount: failed
          ? () => '"consecutiveFailureCount" + 1'
          : 0,
      },
    );
  }
}
