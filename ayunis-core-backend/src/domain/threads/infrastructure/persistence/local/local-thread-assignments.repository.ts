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
    this.logger.log('updateSourceAssignments', { params });

    const threadEntity = await this.threadRepository.findOne({
      where: { id: params.threadId, userId: params.userId },
      relations: ['sourceAssignments'],
    });

    if (!threadEntity) {
      throw new ThreadNotFoundError(params.threadId, params.userId);
    }

    const sourceAssignmentsToDelete =
      threadEntity.sourceAssignments?.filter(
        (assignment) =>
          !params.sourceAssignments.some(
            (s) => s.source.id === assignment.source.id,
          ),
      ) ?? [];

    await this.threadSourceAssignmentRepository.remove(
      sourceAssignmentsToDelete,
    );

    const sourceAssignmentRecords = params.sourceAssignments.map((assignment) =>
      this.sourceAssignmentMapper.toRecord(assignment, params.threadId),
    );

    threadEntity.sourceAssignments = sourceAssignmentRecords;
    await this.threadRepository.save(threadEntity);
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
