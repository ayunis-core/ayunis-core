import type { UUID } from 'crypto';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { TransactionHost } from '@nestjs-cls/transactional';
import { TransactionalAdapterTypeOrm } from '@nestjs-cls/transactional-adapter-typeorm';
import { In, Not, type EntityManager, type Repository } from 'typeorm';
import { OparlSyncRunsRepository } from 'src/domain/oparl/application/ports/oparl-sync-runs.repository';
import {
  OparlSyncRunStatus,
  type OparlSyncRun,
} from 'src/domain/oparl/domain/oparl-sync-run.entity';
import { OparlSyncRunMapper } from './mappers/oparl-sync-run.mapper';
import { OparlSyncRunRecord } from './schema/oparl-sync-run.record';

@Injectable()
export class PostgresOparlSyncRunsRepository extends OparlSyncRunsRepository {
  constructor(
    @InjectRepository(OparlSyncRunRecord)
    private readonly defaultRepository: Repository<OparlSyncRunRecord>,
    private readonly txHost: TransactionHost<TransactionalAdapterTypeOrm>,
  ) {
    super();
  }

  private get repository(): Repository<OparlSyncRunRecord> {
    const manager = this.txHost.tx as EntityManager | undefined;
    return manager?.getRepository(OparlSyncRunRecord) ?? this.defaultRepository;
  }

  async create(run: OparlSyncRun): Promise<void> {
    await this.repository.insert(OparlSyncRunMapper.toRecord(run));
  }

  async findById(id: UUID): Promise<OparlSyncRun | null> {
    const record = await this.repository.findOne({ where: { id } });
    return record ? OparlSyncRunMapper.toDomain(record) : null;
  }

  async update(run: OparlSyncRun): Promise<void> {
    await this.repository.update(
      { id: run.id },
      {
        status: run.status,
        finishedAt: run.finishedAt,
        error: run.error,
        stats: run.stats,
      },
    );
  }

  async failRunning(
    systemId: UUID,
    exceptRunId: UUID,
    error: string,
    now: Date,
  ): Promise<UUID[]> {
    const result = await this.repository
      .createQueryBuilder()
      .update()
      .set({ status: OparlSyncRunStatus.FAILED, error, finishedAt: now })
      .where({
        systemId,
        status: OparlSyncRunStatus.RUNNING,
        id: Not(exceptRunId),
      })
      .returning(['id'])
      .execute();
    return (result.raw as Array<{ id: UUID }>).map(({ id }) => id);
  }

  async findRunning(systemIds: UUID[]): Promise<OparlSyncRun[]> {
    if (systemIds.length === 0) return [];
    const records = await this.repository.find({
      where: { systemId: In(systemIds), status: OparlSyncRunStatus.RUNNING },
    });
    return records.map((record) => OparlSyncRunMapper.toDomain(record));
  }
}
