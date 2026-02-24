import { Thread } from 'src/domain/threads/domain/thread.entity';
import {
  ThreadsFindAllFilters,
  ThreadsFindAllOptions,
  ThreadsPagination,
  ThreadsRepository,
} from 'src/domain/threads/application/ports/threads.repository';
import { Logger, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsRelations, Repository } from 'typeorm';
import { ThreadRecord } from './schema/thread.record';
import { ThreadMapper } from './mappers/thread.mapper';
import { UUID } from 'crypto';
import { ThreadNotFoundError } from 'src/domain/threads/application/threads.errors';
import { SourceAssignment } from 'src/domain/threads/domain/thread-source-assignment.entity';
import { ThreadSourceAssignmentMapper } from './mappers/thread-source-assignment.mapper';
import { ThreadSourceAssignmentRecord } from './schema/thread-source-assignment.record';
import { Paginated } from 'src/common/pagination/paginated.entity';
import type { McpIntegrationRecord } from 'src/domain/mcp/infrastructure/persistence/postgres/schema/mcp-integration.record';
import type { KnowledgeBaseRecord } from 'src/domain/knowledge-bases/infrastructure/persistence/local/schema/knowledge-base.record';
import { ThreadsConstants } from 'src/domain/threads/domain/threads.constants';

@Injectable()
export class LocalThreadsRepository extends ThreadsRepository {
  private readonly logger = new Logger(LocalThreadsRepository.name);

  constructor(
    @InjectRepository(ThreadRecord)
    private readonly threadRepository: Repository<ThreadRecord>,
    @InjectRepository(ThreadSourceAssignmentRecord)
    private readonly threadSourceAssignmentRepository: Repository<ThreadSourceAssignmentRecord>,
    private readonly threadMapper: ThreadMapper,
    private readonly sourceAssignmentMapper: ThreadSourceAssignmentMapper,
  ) {
    super();
  }

  async create(thread: Thread): Promise<Thread> {
    this.logger.log('create', { thread });
    const threadEntity = this.threadMapper.toRecord(thread);
    const savedThreadEntity = await this.threadRepository.save(threadEntity);
    const reloadedThreadEntity = await this.threadRepository.findOne({
      where: { id: savedThreadEntity.id },
      relations: [
        'messages',
        'model',
        'sourceAssignments',
        'sourceAssignments.source',
        'knowledgeBases',
      ],
      order: {
        messages: {
          createdAt: 'ASC', // Ensure messages are ordered chronologically
        },
      },
    });
    if (!reloadedThreadEntity) {
      throw new ThreadNotFoundError(
        savedThreadEntity.id,
        savedThreadEntity.userId,
      );
    }
    return this.threadMapper.toDomain(reloadedThreadEntity);
  }

  async findOne(id: UUID, userId: UUID): Promise<Thread | null> {
    this.logger.log('findOne', { id, userId });
    const threadEntity = await this.threadRepository.findOne({
      where: { id, userId },
      relations: {
        messages: true,
        model: true,
        sourceAssignments: {
          source: true,
        },
        knowledgeBases: true,
      },
      order: {
        messages: {
          createdAt: 'ASC', // Ensure messages are ordered chronologically
        },
      },
    });
    if (!threadEntity) {
      return null;
    }
    return this.threadMapper.toDomain(threadEntity);
  }

  async findAll(
    userId: UUID,
    options?: ThreadsFindAllOptions,
    filters?: ThreadsFindAllFilters,
    pagination?: ThreadsPagination,
  ): Promise<Paginated<Thread>> {
    this.logger.log('findAll', { userId, filters, pagination });

    const queryBuilder = this.threadRepository
      .createQueryBuilder('thread')
      .where('thread.userId = :userId', { userId });

    if (filters?.search) {
      queryBuilder.andWhere('thread.title ILIKE :search', {
        search: `%${filters.search}%`,
      });
    }

    if (filters?.agentId) {
      queryBuilder.andWhere('thread.agentId = :agentId', {
        agentId: filters.agentId,
      });
    }

    // Add relations based on options
    if (options?.withMessages) {
      queryBuilder.leftJoinAndSelect('thread.messages', 'messages');
    }
    if (options?.withSources) {
      queryBuilder.leftJoinAndSelect(
        'thread.sourceAssignments',
        'sourceAssignments',
      );
      queryBuilder.leftJoinAndSelect('sourceAssignments.source', 'source');
      queryBuilder.leftJoinAndSelect(
        'source.textSourceDetails',
        'textSourceDetails',
      );
      queryBuilder.leftJoinAndSelect(
        'source.dataSourceDetails',
        'dataSourceDetails',
      );
    }
    if (options?.withModel) {
      queryBuilder.leftJoinAndSelect('thread.model', 'model');
    }

    // Order by most recent first (by creation time)
    queryBuilder.orderBy('thread.createdAt', 'DESC');

    // Apply messages ordering if needed
    if (options?.withMessages) {
      queryBuilder.addOrderBy('messages.createdAt', 'ASC');
    }

    // Apply pagination and get data with count in one call
    // getManyAndCount() automatically uses COUNT(DISTINCT thread.id) for correct totals with joins
    const limit = pagination?.limit ?? ThreadsConstants.DEFAULT_LIMIT;
    const offset = pagination?.offset ?? 0;

    const [threadEntities, total] = await queryBuilder
      .skip(offset)
      .take(limit)
      .getManyAndCount();

    const threads = threadEntities.map((entity) =>
      this.threadMapper.toDomain(entity),
    );

    return new Paginated<Thread>({
      data: threads,
      limit,
      offset,
      total,
    });
  }

  async findAllByModel(
    modelId: UUID,
    options?: ThreadsFindAllOptions,
  ): Promise<Thread[]> {
    this.logger.log('findAllByModel', { modelId });
    const threadEntities = await this.threadRepository.find({
      where: { modelId },
      relations: this.getRelations(options),
      order: options?.withMessages
        ? {
            messages: {
              createdAt: 'ASC', // Ensure messages are ordered chronologically
            },
          }
        : undefined,
    });
    return threadEntities.map((entity) => this.threadMapper.toDomain(entity));
  }

  async findAllByAgent(
    agentId: UUID,
    options?: ThreadsFindAllOptions,
  ): Promise<Thread[]> {
    this.logger.log('findAllByAgent', { agentId });
    const threadEntities = await this.threadRepository.find({
      where: { agentId },
      relations: this.getRelations(options),
      order: options?.withMessages
        ? {
            messages: {
              createdAt: 'ASC', // Ensure messages are ordered chronologically
            },
          }
        : undefined,
    });
    return threadEntities.map((entity) => this.threadMapper.toDomain(entity));
  }

  private getRelations(
    options?: ThreadsFindAllOptions,
  ): FindOptionsRelations<ThreadRecord> {
    const relations: FindOptionsRelations<ThreadRecord> = {
      messages: options?.withMessages ? true : false,
      sourceAssignments: options?.withSources
        ? {
            source: true,
          }
        : false,
      model: options?.withModel ? true : false,
      knowledgeBases: options?.withKnowledgeBases ? true : false,
    };
    return relations;
  }

  async update(thread: Thread): Promise<Thread> {
    this.logger.log('update', { threadId: thread.id });
    const threadRecord = this.threadMapper.toRecord(thread);
    const savedThreadRecord = await this.threadRepository.save(threadRecord);
    return this.threadMapper.toDomain(savedThreadRecord);
  }

  async updateTitle(params: {
    threadId: UUID;
    userId: UUID;
    title: string;
  }): Promise<void> {
    this.logger.log('updateTitle', { params });
    const result = await this.threadRepository.update(
      { id: params.threadId, userId: params.userId },
      { title: params.title },
    );
    if (!result.affected || result.affected === 0) {
      throw new ThreadNotFoundError(params.threadId, params.userId);
    }
  }

  async updateSourceAssignments(params: {
    threadId: UUID;
    userId: UUID;
    sourceAssignments: SourceAssignment[];
  }): Promise<void> {
    this.logger.log('updateSourceAssignments', { params });

    // Find the thread with existing source assignments
    const threadEntity = await this.threadRepository.findOne({
      where: { id: params.threadId, userId: params.userId },
      relations: ['sourceAssignments'],
    });

    if (!threadEntity) {
      throw new ThreadNotFoundError(params.threadId, params.userId);
    }

    // Delete the source assignments that are not in the new list
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

    // Map domain source assignments to records
    const sourceAssignmentRecords = params.sourceAssignments.map((assignment) =>
      this.sourceAssignmentMapper.toRecord(assignment, params.threadId),
    );

    // Update the source assignments (cascade will handle the database operations)
    threadEntity.sourceAssignments = sourceAssignmentRecords;

    // Save the thread with updated source assignments
    await this.threadRepository.save(threadEntity);
  }

  async updateModel(params: {
    threadId: UUID;
    userId: UUID;
    permittedModelId: UUID;
  }): Promise<void> {
    this.logger.log('updateModel', {
      threadId: params.threadId,
      userId: params.userId,
      permittedModelId: params.permittedModelId,
    });
    const result = await this.threadRepository
      .createQueryBuilder()
      .update(ThreadRecord)
      .set({
        modelId: params.permittedModelId,
        agentId: () => 'NULL',
      })
      .where('id = :threadId AND userId = :userId', {
        threadId: params.threadId,
        userId: params.userId,
      })
      .execute();
    if (!result.affected || result.affected === 0) {
      throw new ThreadNotFoundError(params.threadId, params.userId);
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

  async updateKnowledgeBases(params: {
    threadId: UUID;
    userId: UUID;
    knowledgeBaseIds: UUID[];
  }): Promise<void> {
    this.logger.log('updateKnowledgeBases', {
      threadId: params.threadId,
      knowledgeBaseIds: params.knowledgeBaseIds,
    });

    const threadEntity = await this.threadRepository.findOne({
      where: { id: params.threadId, userId: params.userId },
      relations: ['knowledgeBases'],
    });

    if (!threadEntity) {
      throw new ThreadNotFoundError(params.threadId, params.userId);
    }

    threadEntity.knowledgeBases = params.knowledgeBaseIds.map(
      (id) => ({ id }) as KnowledgeBaseRecord,
    );

    await this.threadRepository.save(threadEntity);
  }

  async delete(id: UUID, userId: UUID): Promise<void> {
    this.logger.log('delete', { id, userId });
    await this.threadRepository.delete({ id, userId });
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
        'id IN ' +
          this.threadSourceAssignmentRepository
            .createQueryBuilder('tsa')
            .select('tsa.id')
            .innerJoin('tsa.thread', 'thread')
            .where('tsa.originSkillId = :originSkillId')
            .andWhere('thread.userId IN (:...userIds)')
            .getQuery(),
      )
      .setParameters({
        originSkillId: params.originSkillId,
        userIds: params.userIds,
      })
      .execute();
  }

  async findAllByOrgIdWithSources(orgId: UUID): Promise<Thread[]> {
    this.logger.log('findAllByOrgIdWithSources', { orgId });
    const threadEntities = await this.threadRepository
      .createQueryBuilder('thread')
      .innerJoin('users', 'user', 'user.id = thread.userId')
      .leftJoinAndSelect('thread.sourceAssignments', 'sourceAssignments')
      .leftJoinAndSelect('sourceAssignments.source', 'source')
      .leftJoinAndSelect('source.textSourceDetails', 'textSourceDetails')
      .leftJoinAndSelect('source.dataSourceDetails', 'dataSourceDetails')
      .where('user.orgId = :orgId', { orgId })
      .getMany();
    return threadEntities.map((entity) => this.threadMapper.toDomain(entity));
  }
}
