import type { UUID } from 'crypto';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { TransactionHost } from '@nestjs-cls/transactional';
import { TransactionalAdapterTypeOrm } from '@nestjs-cls/transactional-adapter-typeorm';
import type { EntityManager, Repository } from 'typeorm';
import { OparlSystemsRepository } from 'src/domain/oparl/application/ports/oparl-systems.repository';
import type {
  OparlSystem,
  OparlSystemMetadata,
} from 'src/domain/oparl/domain/oparl-system.entity';
import { OparlSystemMapper } from 'src/domain/oparl/infrastructure/persistence/postgres/mappers/oparl-system.mapper';
import { OparlSystemRecord } from 'src/domain/oparl/infrastructure/persistence/postgres/schema/oparl-system.record';

@Injectable()
export class PostgresOparlSystemsRepository extends OparlSystemsRepository {
  constructor(
    @InjectRepository(OparlSystemRecord)
    private readonly defaultRepository: Repository<OparlSystemRecord>,
    private readonly txHost: TransactionHost<TransactionalAdapterTypeOrm>,
  ) {
    super();
  }

  private get repository(): Repository<OparlSystemRecord> {
    const manager = this.txHost.tx as EntityManager | undefined;
    return manager?.getRepository(OparlSystemRecord) ?? this.defaultRepository;
  }

  async createIfAbsent(system: OparlSystem): Promise<boolean> {
    const result = await this.repository
      .createQueryBuilder()
      .insert()
      .values(OparlSystemMapper.toRecord(system))
      .orIgnore()
      .returning(['id'])
      .execute();
    return (result.raw as unknown[]).length > 0;
  }

  async findById(id: UUID): Promise<OparlSystem | null> {
    const record = await this.repository.findOne({ where: { id } });
    return record ? OparlSystemMapper.toDomain(record) : null;
  }

  existsWithUrl(url: string): Promise<boolean> {
    return this.repository.exists({ where: { url } });
  }

  async findAll(): Promise<OparlSystem[]> {
    const records = await this.repository.find({
      order: { name: 'ASC', createdAt: 'ASC' },
    });
    return records.map((record) => OparlSystemMapper.toDomain(record));
  }

  async claimDue(now: Date, leaseUntil: Date, limit: number): Promise<UUID[]> {
    const rows = await this.repository.query<[Array<{ id: UUID }>, number]>(
      `UPDATE "oparl_systems" SET "nextSyncAt" = $2
       WHERE "id" IN (
         SELECT "id" FROM "oparl_systems" WHERE "nextSyncAt" <= $1
         ORDER BY "nextSyncAt" LIMIT $3 FOR UPDATE SKIP LOCKED
       )
       RETURNING "id"`,
      [now, leaseUntil, limit],
    );
    return rows[0].map(({ id }) => id);
  }

  async updateMetadata(
    id: UUID,
    { name, vendor, product, oparlVersion, website, raw }: OparlSystemMetadata,
  ): Promise<void> {
    await this.repository.update(
      { id },
      { name, vendor, product, oparlVersion, website, raw },
    );
  }

  async updateSyncState(system: OparlSystem): Promise<void> {
    await this.repository.update(
      { id: system.id },
      OparlSystemMapper.toSyncState(system),
    );
  }
}
