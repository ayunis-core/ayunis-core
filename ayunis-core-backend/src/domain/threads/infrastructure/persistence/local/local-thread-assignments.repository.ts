import { Logger, Injectable } from '@nestjs/common';
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

@Injectable()
export class LocalThreadAssignmentsRepository {
  private readonly logger = new Logger(LocalThreadAssignmentsRepository.name);

  constructor(
    @InjectRepository(ThreadRecord)
    private readonly threadRepository: Repository<ThreadRecord>,
    @InjectRepository(ThreadSourceAssignmentRecord)
    private readonly threadSourceAssignmentRepository: Repository<ThreadSourceAssignmentRecord>,
    @InjectRepository(ThreadKnowledgeBaseAssignmentRecord)
    private readonly threadKbAssignmentRepository: Repository<ThreadKnowledgeBaseAssignmentRecord>,
    private readonly sourceAssignmentMapper: ThreadSourceAssignmentMapper,
  ) {}

  async updateSourceAssignments(params: {
    threadId: UUID;
    userId: UUID;
    sourceAssignments: SourceAssignment[];
  }): Promise<void> {
    const threadEntity = await this.threadRepository.findOne({
      where: { id: params.threadId, userId: params.userId },
      relations: ['sourceAssignments'],
    });

    if (!threadEntity) {
      throw new ThreadNotFoundError(params.threadId, params.userId);
    }

    // Diff against DB state so we only INSERT genuinely new rows and only
    // DELETE dropped ones; touching unchanged rows would both waste writes
    // and race with cascade deletes on the source FK.
    const existing = threadEntity.sourceAssignments ?? [];
    const targetSourceIds = new Set(
      params.sourceAssignments.map((a) => a.source.id),
    );
    const existingSourceIds = new Set(existing.map((a) => a.sourceId));

    const toDelete = existing.filter(
      (assignment) => !targetSourceIds.has(assignment.sourceId),
    );
    const toInsert = params.sourceAssignments.filter(
      (assignment) => !existingSourceIds.has(assignment.source.id),
    );

    this.logger.log('updateSourceAssignments', {
      threadId: params.threadId,
      userId: params.userId,
      addCount: toInsert.length,
      removeCount: toDelete.length,
    });

    if (toDelete.length > 0) {
      await this.threadSourceAssignmentRepository.remove(toDelete);
    }

    if (toInsert.length > 0) {
      const records = toInsert.map((assignment) =>
        this.sourceAssignmentMapper.toRecord(assignment, params.threadId),
      );
      await this.threadSourceAssignmentRepository.save(records);
    }
  }

  async updateMcpIntegrations(params: {
    threadId: UUID;
    userId: UUID;
    mcpIntegrationIds: UUID[];
  }): Promise<void> {
    this.logger.log('updateMcpIntegrations', {
      threadId: params.threadId,
      mcpIntegrationIds: params.mcpIntegrationIds,
    });

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
    this.logger.log('addKnowledgeBaseAssignment', {
      threadId: params.threadId,
      knowledgeBaseId: params.knowledgeBaseId,
      originSkillId: params.originSkillId,
    });

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
    this.logger.log('removeKnowledgeBaseAssignment', {
      threadId: params.threadId,
      knowledgeBaseId: params.knowledgeBaseId,
      originSkillId: params.originSkillId,
    });

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
    this.logger.log('removeSourceAssignmentsByOriginSkill', {
      originSkillId: params.originSkillId,
      userCount: params.userIds.length,
    });

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
    this.logger.log('removeKnowledgeBaseAssignmentsByOriginSkill', {
      originSkillId: params.originSkillId,
      userCount: params.userIds.length,
      knowledgeBaseId: params.knowledgeBaseId,
    });

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

  async removeDirectKnowledgeBaseAssignments(params: {
    knowledgeBaseId: UUID;
    userIds: UUID[];
  }): Promise<void> {
    this.logger.log('removeDirectKnowledgeBaseAssignments', {
      knowledgeBaseId: params.knowledgeBaseId,
      userCount: params.userIds.length,
    });

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
