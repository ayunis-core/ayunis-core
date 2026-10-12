import type { TransactionalAdapterTypeOrm } from '@nestjs-cls/transactional-adapter-typeorm';
import type { EntityManager } from 'typeorm';
import { TransactionHost } from '@nestjs-cls/transactional';
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { UUID, randomUUID } from 'crypto';
import { ThreadRecord } from './schema/thread.record';
import { ThreadSourceAssignmentRecord } from './schema/thread-source-assignment.record';
import { ThreadKnowledgeBaseAssignmentRecord } from './schema/thread-knowledge-base-assignment.record';
import { ThreadSourceAssignmentMapper } from './mappers/thread-source-assignment.mapper';
import { ThreadNotFoundError } from 'src/domain/threads/application/threads.errors';
import type { SourceAssignment } from 'src/domain/threads/domain/thread-source-assignment.entity';
import type { McpIntegrationRecord } from 'src/domain/mcp/infrastructure/persistence/postgres/schema/mcp-integration.record';
import type { StaleThreadSourceRef } from 'src/domain/threads/application/ports/threads.repository';

// Resolves each directly-assigned thread's latest message once (top-1 probe on
// the messages (threadId, createdAt) index) instead of probing messages per
// assignment, which kept the nightly scan at the statement timeout (AYC-1237).
const STALE_DIRECT_SOURCES_SQL = `
  WITH direct_assignments AS (
    SELECT "sourceId", "threadId"
    FROM "thread_source_assignments"
    WHERE "originSkillId" IS NULL
  ),
  thread_activity AS (
    SELECT direct_threads."threadId", last_message."createdAt" AS "lastMessageAt"
    FROM (SELECT DISTINCT "threadId" FROM direct_assignments) direct_threads
    LEFT JOIN LATERAL (
      SELECT m."createdAt"
      FROM "messages" m
      WHERE m."threadId" = direct_threads."threadId"
      ORDER BY m."createdAt" DESC
      LIMIT 1
    ) last_message ON TRUE
  ),
  stale_sources AS (
    SELECT d."sourceId"
    FROM direct_assignments d
    JOIN thread_activity ta ON ta."threadId" = d."threadId"
    GROUP BY d."sourceId"
    HAVING bool_and(ta."lastMessageAt" IS NOT NULL AND ta."lastMessageAt" < $1)
  )
  SELECT DISTINCT d."sourceId" AS "sourceId", u."orgId" AS "orgId"
  FROM stale_sources s
  JOIN direct_assignments d ON d."sourceId" = s."sourceId"
  JOIN "threads" t ON t."id" = d."threadId"
  JOIN "users" u ON u."id" = t."userId"
`;

@Injectable()
export class LocalThreadAssignmentsRepository {
  private readonly logger = new Logger(LocalThreadAssignmentsRepository.name);

  constructor(
    @InjectRepository(ThreadRecord)
    private readonly defaultThreadRepository: Repository<ThreadRecord>,
    @InjectRepository(ThreadSourceAssignmentRecord)
    private readonly defaultThreadSourceAssignmentRepository: Repository<ThreadSourceAssignmentRecord>,
    @InjectRepository(ThreadKnowledgeBaseAssignmentRecord)
    private readonly defaultThreadKbAssignmentRepository: Repository<ThreadKnowledgeBaseAssignmentRecord>,
    private readonly sourceAssignmentMapper: ThreadSourceAssignmentMapper,
    private readonly txHost: TransactionHost<TransactionalAdapterTypeOrm>,
  ) {}

  private get threadRepository(): Repository<ThreadRecord> {
    const manager = this.txHost.tx as EntityManager | undefined;
    return manager?.getRepository(ThreadRecord) ?? this.defaultThreadRepository;
  }

  private get threadSourceAssignmentRepository(): Repository<ThreadSourceAssignmentRecord> {
    const manager = this.txHost.tx as EntityManager | undefined;
    return (
      manager?.getRepository(ThreadSourceAssignmentRecord) ??
      this.defaultThreadSourceAssignmentRepository
    );
  }

  private get threadKbAssignmentRepository(): Repository<ThreadKnowledgeBaseAssignmentRecord> {
    const manager = this.txHost.tx as EntityManager | undefined;
    return (
      manager?.getRepository(ThreadKnowledgeBaseAssignmentRecord) ??
      this.defaultThreadKbAssignmentRepository
    );
  }

  async findSourceAssignmentsByThreadId(
    threadId: UUID,
  ): Promise<ThreadSourceAssignmentRecord[]> {
    return this.threadSourceAssignmentRepository
      .createQueryBuilder('assignment')
      .leftJoinAndSelect('assignment.source', 'source')
      .leftJoinAndSelect('source.dataSourceDetails', 'dataSourceDetails')
      .where('assignment.threadId = :threadId', { threadId })
      .getMany();
  }

  /**
   * Writes only the row being added. An earlier version took the caller's
   * entire desired assignment set and re-derived the diff from a second,
   * independently timed read — so a row deleted between the two reads (by a
   * concurrent source removal or the stale-source cleanup task, both of which
   * cascade) was re-INSERTed with its original primary key and raised a 23505
   * (AYC-551).
   */
  async addSourceAssignment(params: {
    threadId: UUID;
    userId: UUID;
    sourceAssignment: SourceAssignment;
  }): Promise<void> {
    this.logger.log(
      {
        threadId: params.threadId,
        userId: params.userId,
        sourceId: params.sourceAssignment.source.id,
      },
      'addSourceAssignment',
    );

    const threadExists = await this.threadRepository.exists({
      where: { id: params.threadId, userId: params.userId },
    });

    if (!threadExists) {
      throw new ThreadNotFoundError(params.threadId, params.userId);
    }

    const record = this.sourceAssignmentMapper.toRecord(
      params.sourceAssignment,
      params.threadId,
    );
    await this.threadSourceAssignmentRepository.save(record);
  }

  async updateMcpIntegrations(params: {
    threadId: UUID;
    userId: UUID;
    mcpIntegrationIds: UUID[];
  }): Promise<void> {
    this.logger.log(
      {
        threadId: params.threadId,
        mcpIntegrationIds: params.mcpIntegrationIds,
      },
      'updateMcpIntegrations',
    );

    const threadEntity = await this.threadRepository.findOne({
      where: { id: params.threadId, userId: params.userId },
      relations: ['mcpIntegrations'],
    });

    if (!threadEntity) {
      throw new ThreadNotFoundError(params.threadId, params.userId);
    }

    threadEntity.mcpIntegrations = params.mcpIntegrationIds.map(
      (id) => ({ id }) as McpIntegrationRecord,
    );

    await this.threadRepository.save(threadEntity);
  }

  async addKnowledgeBaseAssignment(params: {
    threadId: UUID;
    userId: UUID;
    knowledgeBaseId: UUID;
    originSkillId?: UUID;
  }): Promise<void> {
    this.logger.log(
      {
        threadId: params.threadId,
        knowledgeBaseId: params.knowledgeBaseId,
        originSkillId: params.originSkillId,
      },
      'addKnowledgeBaseAssignment',
    );

    const threadEntity = await this.threadRepository.findOne({
      where: { id: params.threadId, userId: params.userId },
    });

    if (!threadEntity) {
      throw new ThreadNotFoundError(params.threadId, params.userId);
    }

    const record = new ThreadKnowledgeBaseAssignmentRecord();
    record.id = randomUUID();
    record.threadId = params.threadId;
    record.knowledgeBaseId = params.knowledgeBaseId;
    record.originSkillId = params.originSkillId ?? null;

    await this.threadKbAssignmentRepository.save(record);
  }

  async removeKnowledgeBaseAssignment(params: {
    threadId: UUID;
    userId: UUID;
    knowledgeBaseId: UUID;
    originSkillId?: UUID;
  }): Promise<void> {
    this.logger.log(
      {
        threadId: params.threadId,
        knowledgeBaseId: params.knowledgeBaseId,
        originSkillId: params.originSkillId,
      },
      'removeKnowledgeBaseAssignment',
    );

    const threadEntity = await this.threadRepository.findOne({
      where: { id: params.threadId, userId: params.userId },
    });

    if (!threadEntity) {
      throw new ThreadNotFoundError(params.threadId, params.userId);
    }

    await this.threadKbAssignmentRepository.delete({
      threadId: params.threadId,
      knowledgeBaseId: params.knowledgeBaseId,
      originSkillId: params.originSkillId ?? IsNull(),
    });
  }

  async removeSourceAssignmentsByOriginSkill(params: {
    originSkillId: UUID;
    userIds: UUID[];
  }): Promise<void> {
    this.logger.log(
      {
        originSkillId: params.originSkillId,
        userCount: params.userIds.length,
      },
      'removeSourceAssignmentsByOriginSkill',
    );

    if (params.userIds.length === 0) {
      return;
    }

    await this.threadSourceAssignmentRepository
      .createQueryBuilder('tsa')
      .delete()
      .from(ThreadSourceAssignmentRecord)
      .where(
        'id IN (' +
          this.threadSourceAssignmentRepository
            .createQueryBuilder('tsa')
            .select('tsa.id')
            .innerJoin('tsa.thread', 'thread')
            .where('tsa.originSkillId = :originSkillId')
            .andWhere('thread.userId IN (:...userIds)')
            .getQuery() +
          ')',
      )
      .setParameters({
        originSkillId: params.originSkillId,
        userIds: params.userIds,
      })
      .execute();
  }

  async removeKnowledgeBaseAssignmentsByOriginSkill(params: {
    originSkillId: UUID;
    userIds: UUID[];
    knowledgeBaseId?: UUID;
  }): Promise<void> {
    this.logger.log(
      {
        originSkillId: params.originSkillId,
        userCount: params.userIds.length,
        knowledgeBaseId: params.knowledgeBaseId,
      },
      'removeKnowledgeBaseAssignmentsByOriginSkill',
    );

    if (params.userIds.length === 0) {
      return;
    }

    const subQuery = this.threadKbAssignmentRepository
      .createQueryBuilder('tkba')
      .select('tkba.id')
      .innerJoin('tkba.thread', 'thread')
      .where('tkba.originSkillId = :originSkillId')
      .andWhere('thread.userId IN (:...userIds)');

    if (params.knowledgeBaseId) {
      subQuery.andWhere('tkba.knowledgeBaseId = :knowledgeBaseId');
    }

    const queryParams: Record<string, unknown> = {
      originSkillId: params.originSkillId,
      userIds: params.userIds,
    };

    if (params.knowledgeBaseId) {
      queryParams.knowledgeBaseId = params.knowledgeBaseId;
    }

    await this.threadKbAssignmentRepository
      .createQueryBuilder('tkba')
      .delete()
      .from(ThreadKnowledgeBaseAssignmentRecord)
      .where(`id IN (${subQuery.getQuery()})`)
      .setParameters(queryParams)
      .execute();
  }

  async findSourcesWithOnlyStaleDirectAssignments(
    olderThan: Date,
  ): Promise<StaleThreadSourceRef[]> {
    this.logger.log({ olderThan }, 'findSourcesWithOnlyStaleDirectAssignments');

    return this.threadSourceAssignmentRepository.manager.query<
      StaleThreadSourceRef[]
    >(STALE_DIRECT_SOURCES_SQL, [olderThan]);
  }

  async removeDirectKnowledgeBaseAssignments(params: {
    knowledgeBaseId: UUID;
    userIds: UUID[];
  }): Promise<void> {
    this.logger.log(
      {
        knowledgeBaseId: params.knowledgeBaseId,
        userCount: params.userIds.length,
      },
      'removeDirectKnowledgeBaseAssignments',
    );

    if (params.userIds.length === 0) {
      return;
    }

    await this.threadKbAssignmentRepository
      .createQueryBuilder('tkba')
      .delete()
      .from(ThreadKnowledgeBaseAssignmentRecord)
      .where(
        `id IN (${this.threadKbAssignmentRepository
          .createQueryBuilder('tkba')
          .select('tkba.id')
          .innerJoin('tkba.thread', 'thread')
          .where('tkba.knowledgeBaseId = :knowledgeBaseId')
          .andWhere('tkba.originSkillId IS NULL')
          .andWhere('thread.userId IN (:...userIds)')
          .getQuery()})`,
      )
      .setParameters({
        knowledgeBaseId: params.knowledgeBaseId,
        userIds: params.userIds,
      })
      .execute();
  }
}
