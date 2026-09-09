import { PersonalKnowledgeBase } from 'src/domain/knowledge-bases/domain/personal-knowledge-base.entity';
import type { WorkspaceKnowledgeBase } from 'src/domain/knowledge-bases/domain/workspace-knowledge-base.entity';
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  Brackets,
  In,
  IsNull,
  Repository,
  SelectQueryBuilder,
  type EntityManager,
  type FindOptionsWhere,
} from 'typeorm';
import { TransactionHost } from '@nestjs-cls/transactional';
import type { TransactionalAdapterTypeOrm } from '@nestjs-cls/transactional-adapter-typeorm';
import { randomUUID, type UUID } from 'crypto';
import {
  KnowledgeBaseRepository,
  type KnowledgeBaseByIdsOptions,
  type KnowledgeBaseListOptions,
  type WorkspaceKnowledgeBaseState,
} from 'src/domain/knowledge-bases/application/ports/knowledge-base.repository';
import type { KnowledgeBase } from 'src/domain/knowledge-bases/domain/knowledge-base';
import { KnowledgeBaseRecord } from './schema/knowledge-base.record';
import { KnowledgeBaseMapper } from './mappers/knowledge-base.mapper';
import { SourceRecord } from 'src/domain/sources/infrastructure/persistence/local/schema/source.record';
import type { Source } from 'src/domain/sources/domain/source.entity';
import { SourceMapper } from 'src/domain/sources/infrastructure/persistence/local/mappers/source.mapper';
import { Paginated } from 'src/common/pagination/paginated.entity';
import { KnowledgeBaseActivationRecord } from './schema/knowledge-base-activation.record';
import { ShareScopeType } from 'src/domain/shares/domain/value-objects/share-scope-type.enum';
import { SharedEntityType } from 'src/domain/shares/domain/value-objects/shared-entity-type.enum';
import { buildKnowledgeBaseAccessSubqueries } from './queries/knowledge-base-access.db-query';
import { AccessibleKnowledgeBasesByIdsRepository } from 'src/domain/knowledge-bases/application/ports/accessible-knowledge-bases-by-ids.repository';

@Injectable()
export class LocalKnowledgeBaseRepository
  extends KnowledgeBaseRepository
  implements AccessibleKnowledgeBasesByIdsRepository
{
  private readonly logger = new Logger(LocalKnowledgeBaseRepository.name);

  constructor(
    @InjectRepository(KnowledgeBaseRecord)
    private readonly defaultKnowledgeBaseRepository: Repository<KnowledgeBaseRecord>,
    @InjectRepository(SourceRecord)
    private readonly defaultSourceRepository: Repository<SourceRecord>,
    @InjectRepository(KnowledgeBaseActivationRecord)
    private readonly defaultActivationRepository: Repository<KnowledgeBaseActivationRecord>,
    private readonly mapper: KnowledgeBaseMapper,
    private readonly sourceMapper: SourceMapper,
    private readonly txHost: TransactionHost<TransactionalAdapterTypeOrm>,
  ) {
    super();
  }

  private get knowledgeBaseRepository(): Repository<KnowledgeBaseRecord> {
    const transactionManager = this.txHost.tx as EntityManager | undefined;
    return (
      transactionManager?.getRepository(KnowledgeBaseRecord) ??
      this.defaultKnowledgeBaseRepository
    );
  }

  private get sourceRepository(): Repository<SourceRecord> {
    const transactionManager = this.txHost.tx as EntityManager | undefined;
    return (
      transactionManager?.getRepository(SourceRecord) ??
      this.defaultSourceRepository
    );
  }

  private get activationRepository(): Repository<KnowledgeBaseActivationRecord> {
    const transactionManager = this.txHost.tx as EntityManager | undefined;
    return (
      transactionManager?.getRepository(KnowledgeBaseActivationRecord) ??
      this.defaultActivationRepository
    );
  }

  async findById(id: UUID): Promise<KnowledgeBase | null> {
    this.logger.debug({ id }, 'findById');
    const record = await this.knowledgeBaseRepository.findOne({
      where: { id },
    });
    if (!record) {
      return null;
    }
    return this.mapper.toDomain(record);
  }

  findByIds(
    ids: UUID[],
    options: KnowledgeBaseByIdsOptions & { workspaceId: null },
  ): Promise<PersonalKnowledgeBase[]>;
  findByIds(
    ids: UUID[],
    options: KnowledgeBaseByIdsOptions & { workspaceId: UUID },
  ): Promise<WorkspaceKnowledgeBase[]>;
  findByIds(
    ids: UUID[],
    options?: KnowledgeBaseByIdsOptions,
  ): Promise<KnowledgeBase[]>;
  async findByIds(
    ids: UUID[],
    options?: KnowledgeBaseByIdsOptions,
  ): Promise<KnowledgeBase[]> {
    this.logger.debug({ count: ids.length, options }, 'findByIds');
    if (ids.length === 0) {
      return [];
    }
    const where: FindOptionsWhere<KnowledgeBaseRecord> = { id: In(ids) };
    if (options?.orgId) {
      where.orgId = options.orgId;
    }
    if (options?.workspaceId === null) {
      where.workspaceId = IsNull();
    } else if (options?.workspaceId) {
      where.workspaceId = options.workspaceId;
    }
    const records = await this.knowledgeBaseRepository.find({ where });
    return records.map((record) => {
      if (options?.workspaceId === null) return this.mapper.toPersonal(record);
      if (options?.workspaceId !== undefined)
        return this.mapper.toWorkspace(record);
      return this.mapper.toDomain(record);
    });
  }

  async findAllByUserId(userId: UUID): Promise<PersonalKnowledgeBase[]> {
    this.logger.debug({ userId }, 'findAllByUserId');
    const records = await this.knowledgeBaseRepository.find({
      where: { userId, workspaceId: IsNull() },
      order: { createdAt: 'DESC' },
    });
    return records.map((record) => this.mapper.toPersonal(record));
  }

  async findAllOwnedByUserId(userId: UUID): Promise<KnowledgeBase[]> {
    this.logger.debug({ userId }, 'findAllOwnedByUserId');
    const records = await this.knowledgeBaseRepository
      .createQueryBuilder('knowledgeBase')
      .leftJoin('knowledgeBase.workspace', 'workspace')
      .where('knowledgeBase.userId = :userId', { userId })
      .orWhere('workspace.userId = :userId', { userId })
      .orderBy('knowledgeBase.createdAt', 'DESC')
      .getMany();
    return records.map((record) => this.mapper.toDomain(record));
  }

  async findAllByWorkspaceId(
    workspaceId: UUID,
  ): Promise<WorkspaceKnowledgeBase[]> {
    this.logger.debug({ workspaceId }, 'findAllByWorkspaceId');
    const records = await this.knowledgeBaseRepository.find({
      where: { workspaceId },
      order: { createdAt: 'DESC' },
    });
    return records.map((record) => this.mapper.toWorkspace(record));
  }

  async activate(knowledgeBaseId: UUID, userId: UUID): Promise<void> {
    await this.activationRepository
      .createQueryBuilder()
      .insert()
      .into(KnowledgeBaseActivationRecord)
      .values({ id: randomUUID(), knowledgeBaseId, userId })
      .orIgnore()
      .execute();
  }

  async deactivate(knowledgeBaseId: UUID, userId: UUID): Promise<void> {
    await this.activationRepository.delete({ knowledgeBaseId, userId });
  }

  async isActive(knowledgeBaseId: UUID, userId: UUID): Promise<boolean> {
    return this.activationRepository.existsBy({ knowledgeBaseId, userId });
  }

  async getActiveIds(userId: UUID): Promise<Set<UUID>> {
    const activations = await this.activationRepository.find({
      select: { knowledgeBaseId: true },
      where: { userId },
    });
    return new Set(activations.map(({ knowledgeBaseId }) => knowledgeBaseId));
  }

  async activateForWorkspace(
    knowledgeBaseId: UUID,
    workspaceId: UUID,
  ): Promise<void> {
    await this.activationRepository
      .createQueryBuilder()
      .insert()
      .into(KnowledgeBaseActivationRecord)
      .values({
        id: randomUUID(),
        knowledgeBaseId,
        workspaceId,
        userId: null,
      })
      .orIgnore()
      .execute();
  }

  async deactivateForWorkspace(
    knowledgeBaseId: UUID,
    workspaceId: UUID,
  ): Promise<void> {
    await this.activationRepository.delete({ knowledgeBaseId, workspaceId });
  }

  async getWorkspaceStates(
    knowledgeBaseIds: UUID[],
    workspaceId: UUID,
  ): Promise<Map<UUID, WorkspaceKnowledgeBaseState>> {
    if (knowledgeBaseIds.length === 0) return new Map();
    const activations = await this.activationRepository.find({
      select: { knowledgeBaseId: true },
      where: { knowledgeBaseId: In(knowledgeBaseIds), workspaceId },
    });
    return new Map(
      activations.map(({ knowledgeBaseId }) => [
        knowledgeBaseId,
        { isActive: true },
      ]),
    );
  }

  async findActiveAccessible(
    userId: UUID,
    orgId: UUID,
  ): Promise<PersonalKnowledgeBase[]> {
    const records = await this.buildAccessiblePersonalQuery(userId, orgId)
      .innerJoin(
        KnowledgeBaseActivationRecord,
        'activation',
        'activation.knowledgeBaseId = knowledgeBase.id AND activation.userId = :userId',
      )
      .orderBy('LOWER(knowledgeBase.name)', 'ASC')
      .addOrderBy('knowledgeBase.id', 'ASC')
      .getMany();
    return records.map((record) => this.mapper.toPersonal(record));
  }

  async findAccessibleByIds(
    ids: UUID[],
    userId: UUID,
    orgId: UUID,
  ): Promise<PersonalKnowledgeBase[]> {
    if (ids.length === 0) return [];

    const records = await this.buildAccessiblePersonalQuery(userId, orgId)
      .andWhere('knowledgeBase.id IN (:...ids)', { ids })
      .getMany();
    return records.map((record) => this.mapper.toPersonal(record));
  }

  private buildAccessiblePersonalQuery(
    userId: UUID,
    orgId: UUID,
  ): SelectQueryBuilder<KnowledgeBaseRecord> {
    const query =
      this.knowledgeBaseRepository.createQueryBuilder('knowledgeBase');
    const access = buildKnowledgeBaseAccessSubqueries(query);
    return query
      .where('knowledgeBase.workspaceId IS NULL')
      .andWhere('knowledgeBase.orgId = :orgId')
      .andWhere(
        new Brackets((accessQuery) => {
          accessQuery
            .where('knowledgeBase.userId = :userId')
            .orWhere(`EXISTS ${access.directShare}`)
            .orWhere(`EXISTS ${access.sharedSkill}`);
        }),
      )
      .setParameters({
        userId,
        orgId,
        skillEntityType: SharedEntityType.SKILL,
        orgScopeType: ShareScopeType.ORG,
        teamScopeType: ShareScopeType.TEAM,
      });
  }

  findPaginatedAccessible(
    userId: UUID,
    workspaceId: undefined,
    sharedKnowledgeBaseIds: UUID[],
    options: KnowledgeBaseListOptions,
  ): Promise<Paginated<PersonalKnowledgeBase>>;
  findPaginatedAccessible(
    userId: UUID,
    workspaceId: UUID,
    sharedKnowledgeBaseIds: UUID[],
    options: KnowledgeBaseListOptions,
  ): Promise<Paginated<WorkspaceKnowledgeBase>>;
  findPaginatedAccessible(
    userId: UUID,
    workspaceId: UUID | undefined,
    sharedKnowledgeBaseIds: UUID[],
    options: KnowledgeBaseListOptions,
  ): Promise<Paginated<KnowledgeBase>>;
  async findPaginatedAccessible(
    userId: UUID,
    workspaceId: UUID | undefined,
    sharedKnowledgeBaseIds: UUID[],
    options: KnowledgeBaseListOptions,
  ): Promise<Paginated<KnowledgeBase>> {
    this.logger.debug(
      {
        userId,
        workspaceId,
        search: options.search,
        limit: options.limit,
        offset: options.offset,
      },
      'findPaginatedAccessible',
    );

    const [records, total] = await this.buildAccessibleKnowledgeBasesQuery(
      userId,
      workspaceId,
      sharedKnowledgeBaseIds,
      options,
    )
      .orderBy('LOWER(knowledgeBase.name)', 'ASC')
      .addOrderBy('knowledgeBase.id', 'ASC')
      .skip(options.offset)
      .take(options.limit)
      .getManyAndCount();

    return new Paginated({
      data: records.map((record) =>
        workspaceId === undefined
          ? this.mapper.toPersonal(record)
          : this.mapper.toWorkspace(record),
      ),
      limit: options.limit,
      offset: options.offset,
      total,
    });
  }

  private buildAccessibleKnowledgeBasesQuery(
    userId: UUID,
    workspaceId: UUID | undefined,
    sharedKnowledgeBaseIds: UUID[],
    options: KnowledgeBaseListOptions,
  ): SelectQueryBuilder<KnowledgeBaseRecord> {
    const queryBuilder =
      this.knowledgeBaseRepository.createQueryBuilder('knowledgeBase');

    if (workspaceId) {
      queryBuilder.where('knowledgeBase.workspaceId = :workspaceId', {
        workspaceId,
      });
    } else {
      queryBuilder
        .where(
          new Brackets((accessQuery) => {
            accessQuery.where('knowledgeBase.userId = :userId', { userId });
            if (sharedKnowledgeBaseIds.length > 0) {
              accessQuery.orWhere(
                'knowledgeBase.id IN (:...sharedKnowledgeBaseIds)',
                { sharedKnowledgeBaseIds },
              );
            }
          }),
        )
        .andWhere('knowledgeBase.workspaceId IS NULL');
    }

    if (options.search) {
      queryBuilder.andWhere('knowledgeBase.name ILIKE :search', {
        search: `%${options.search}%`,
      });
    }

    return queryBuilder;
  }

  save(knowledgeBase: PersonalKnowledgeBase): Promise<PersonalKnowledgeBase>;
  save(knowledgeBase: WorkspaceKnowledgeBase): Promise<WorkspaceKnowledgeBase>;
  save(knowledgeBase: KnowledgeBase): Promise<KnowledgeBase>;
  async save(knowledgeBase: KnowledgeBase): Promise<KnowledgeBase> {
    this.logger.debug({ id: knowledgeBase.id }, 'save');
    const record = this.mapper.toRecord(knowledgeBase);
    const saved = await this.knowledgeBaseRepository.save(record);
    return knowledgeBase instanceof PersonalKnowledgeBase
      ? this.mapper.toPersonal(saved)
      : this.mapper.toWorkspace(saved);
  }

  async delete(knowledgeBase: KnowledgeBase): Promise<void> {
    this.logger.debug({ id: knowledgeBase.id }, 'delete');
    const record = this.mapper.toRecord(knowledgeBase);
    await this.knowledgeBaseRepository.remove(record);
  }

  async assignSourceToKnowledgeBase(
    sourceId: UUID,
    knowledgeBaseId: UUID,
  ): Promise<void> {
    this.logger.debug(
      { sourceId, knowledgeBaseId },
      'assignSourceToKnowledgeBase',
    );
    await this.sourceRepository.update(sourceId, { knowledgeBaseId });
  }

  async findSourcesByKnowledgeBaseId(knowledgeBaseId: UUID): Promise<Source[]> {
    this.logger.debug({ knowledgeBaseId }, 'findSourcesByKnowledgeBaseId');
    const records = await this.sourceRepository.find({
      where: { knowledgeBaseId },
      order: { createdAt: 'DESC' },
    });
    return records.map((record) => this.sourceMapper.toDomain(record));
  }

  async findSourcesByKnowledgeBaseIds(
    knowledgeBaseIds: UUID[],
  ): Promise<Source[]> {
    const uniqueKnowledgeBaseIds = [...new Set(knowledgeBaseIds)];
    if (uniqueKnowledgeBaseIds.length === 0) {
      return [];
    }

    this.logger.debug(
      { count: uniqueKnowledgeBaseIds.length },
      'findSourcesByKnowledgeBaseIds',
    );
    const records = await this.sourceRepository.find({
      where: { knowledgeBaseId: In(uniqueKnowledgeBaseIds) },
      order: { createdAt: 'DESC' },
    });
    return records.map((record) => this.sourceMapper.toDomain(record));
  }

  async countSourcesByKnowledgeBaseId(knowledgeBaseId: UUID): Promise<number> {
    this.logger.debug({ knowledgeBaseId }, 'countSourcesByKnowledgeBaseId');
    return this.sourceRepository.count({ where: { knowledgeBaseId } });
  }

  async countSourcesByKnowledgeBaseIds(
    knowledgeBaseIds: UUID[],
  ): Promise<Map<UUID, number>> {
    if (knowledgeBaseIds.length === 0) {
      return new Map();
    }

    this.logger.debug(
      { count: knowledgeBaseIds.length },
      'countSourcesByKnowledgeBaseIds',
    );
    const rows = await this.sourceRepository
      .createQueryBuilder('source')
      .select('source.knowledgeBaseId', 'knowledgeBaseId')
      .addSelect('COUNT(source.id)', 'count')
      .where('source.knowledgeBaseId IN (:...knowledgeBaseIds)', {
        knowledgeBaseIds,
      })
      .groupBy('source.knowledgeBaseId')
      .getRawMany<{ knowledgeBaseId: UUID; count: string }>();

    const counts = new Map<UUID, number>(
      knowledgeBaseIds.map((knowledgeBaseId) => [knowledgeBaseId, 0]),
    );
    for (const row of rows) {
      counts.set(row.knowledgeBaseId, Number(row.count));
    }
    return counts;
  }

  async findSourceByIdAndKnowledgeBaseId(
    sourceId: UUID,
    knowledgeBaseId: UUID,
  ): Promise<Source | null> {
    this.logger.debug(
      { sourceId, knowledgeBaseId },
      'findSourceByIdAndKnowledgeBaseId',
    );
    const record = await this.sourceRepository.findOne({
      where: { id: sourceId, knowledgeBaseId },
    });
    if (!record) {
      return null;
    }
    return this.sourceMapper.toDomain(record);
  }
}
