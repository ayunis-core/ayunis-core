import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { TransactionHost } from '@nestjs-cls/transactional';
import { TransactionalAdapterTypeOrm } from '@nestjs-cls/transactional-adapter-typeorm';
import { randomUUID, type UUID } from 'crypto';
import {
  type EntityManager,
  In,
  type Repository,
  type SelectQueryBuilder,
} from 'typeorm';
import {
  CollectiveKnowledgeBaseRepository,
  type CollectiveKnowledgeBaseScope,
  type CollectiveKnowledgeBaseTarget,
} from 'src/domain/knowledge-bases/application/ports/collective-knowledge-base.repository';
import { isCollectiveKnowledgeBase } from 'src/domain/knowledge-bases/application/models/collective-knowledge-base-owner';
import type { CollectiveKnowledgeBase } from 'src/domain/knowledge-bases/domain/knowledge-base';
import { KnowledgeBaseMapper } from './mappers/knowledge-base.mapper';
import { usableCollectiveKnowledgeBases } from './local-collective-knowledge-base-scope.query';
import { applyKnowledgeBaseTargetFilter } from './queries/knowledge-base-access.db-query';
import { KnowledgeBaseActivationRecord } from './schema/knowledge-base-activation.record';
import { KnowledgeBaseRecord } from './schema/knowledge-base.record';

@Injectable()
export class LocalCollectiveKnowledgeBaseRepository implements CollectiveKnowledgeBaseRepository {
  constructor(
    @InjectRepository(KnowledgeBaseRecord)
    private readonly defaultRepository: Repository<KnowledgeBaseRecord>,
    private readonly mapper: KnowledgeBaseMapper,
    private readonly txHost: TransactionHost<TransactionalAdapterTypeOrm>,
  ) {}

  private get manager(): EntityManager {
    const transactionManager = this.txHost.tx as EntityManager | undefined;
    return transactionManager ?? this.defaultRepository.manager;
  }

  private get activations(): Repository<KnowledgeBaseActivationRecord> {
    return this.manager.getRepository(KnowledgeBaseActivationRecord);
  }

  async findUsable(
    scope: CollectiveKnowledgeBaseScope,
    ids?: UUID[],
  ): Promise<CollectiveKnowledgeBase[]> {
    if (ids?.length === 0) return [];
    const query = this.usableQuery(scope);
    if (ids) query.andWhere('knowledgeBase.id IN (:...ids)', { ids });
    return this.toCollective(await query.getMany());
  }

  async findActiveUsable(
    scope: CollectiveKnowledgeBaseScope,
    target: CollectiveKnowledgeBaseTarget = {},
  ): Promise<CollectiveKnowledgeBase[]> {
    const query = this.usableQuery(scope)
      .leftJoin(
        KnowledgeBaseActivationRecord,
        'activation',
        'activation.knowledgeBaseId = knowledgeBase.id AND activation.userId = :userId',
        { userId: scope.userId },
      )
      .andWhere('(activation.id IS NULL OR activation.isActive = true)');
    applyKnowledgeBaseTargetFilter(query, target);
    return this.toCollective(await query.getMany());
  }

  async getActiveStates(
    knowledgeBaseIds: UUID[],
    userId: UUID,
  ): Promise<Map<UUID, boolean>> {
    const states = new Map<UUID, boolean>(
      knowledgeBaseIds.map((id) => [id, true]),
    );
    if (knowledgeBaseIds.length === 0) return states;
    const rows = await this.activations.find({
      where: { knowledgeBaseId: In(knowledgeBaseIds), userId },
    });
    for (const row of rows) states.set(row.knowledgeBaseId, row.isActive);
    return states;
  }

  async setActive(
    knowledgeBaseId: UUID,
    userId: UUID,
    isActive: boolean,
  ): Promise<void> {
    const result = await this.activations.update(
      { knowledgeBaseId, userId },
      { isActive },
    );
    if (isActive || result.affected) return;
    await this.activations
      .createQueryBuilder()
      .insert()
      .into(KnowledgeBaseActivationRecord)
      .values({ id: randomUUID(), knowledgeBaseId, userId, isActive })
      .orIgnore()
      .execute();
  }

  private usableQuery(
    scope: CollectiveKnowledgeBaseScope,
  ): SelectQueryBuilder<KnowledgeBaseRecord> {
    return this.manager
      .getRepository(KnowledgeBaseRecord)
      .createQueryBuilder('knowledgeBase')
      .where(usableCollectiveKnowledgeBases(scope))
      .orderBy('LOWER(knowledgeBase.name)', 'ASC')
      .addOrderBy('knowledgeBase.id', 'ASC');
  }

  private toCollective(
    records: KnowledgeBaseRecord[],
  ): CollectiveKnowledgeBase[] {
    return records
      .map((record) => this.mapper.toDomain(record))
      .filter(isCollectiveKnowledgeBase);
  }
}
