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
import { Paginated } from 'src/common/pagination/paginated.entity';
import { ThreadsConstants } from 'src/domain/threads/domain/threads.constants';
import { LocalThreadAssignmentsRepository } from './local-thread-assignments.repository';

@Injectable()
export class LocalThreadsRepository extends ThreadsRepository {
  private readonly logger = new Logger(LocalThreadsRepository.name);

  constructor(
    @InjectRepository(ThreadRecord)
    private readonly threadRepository: Repository<ThreadRecord>,
    private readonly threadMapper: ThreadMapper,
    private readonly assignments: LocalThreadAssignmentsRepository,
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
        'knowledgeBaseAssignments',
        'knowledgeBaseAssignments.knowledgeBase',
        'mcpIntegrations',
      ],
      order: {
        messages: {
          createdAt: 'ASC',
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
        knowledgeBaseAssignments: {
          knowledgeBase: true,
        },
        mcpIntegrations: true,
      },
      order: {
        messages: {
          createdAt: 'ASC',
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
    if (options?.withKnowledgeBases) {
      queryBuilder.leftJoinAndSelect(
        'thread.knowledgeBaseAssignments',
        'knowledgeBaseAssignments',
      );
      queryBuilder.leftJoinAndSelect(
        'knowledgeBaseAssignments.knowledgeBase',
        'knowledgeBase',
      );
    }
    if (options?.withModel) {
      queryBuilder.leftJoinAndSelect('thread.model', 'model');
    }

    queryBuilder.orderBy('thread.createdAt', 'DESC');

    if (options?.withMessages) {
      queryBuilder.addOrderBy('messages.createdAt', 'ASC');
    }

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
        ? { messages: { createdAt: 'ASC' } }
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
        ? { messages: { createdAt: 'ASC' } }
        : undefined,
    });
    return threadEntities.map((entity) => this.threadMapper.toDomain(entity));
  }

  private getRelations(
    options?: ThreadsFindAllOptions,
  ): FindOptionsRelations<ThreadRecord> {
    return {
      messages: options?.withMessages ? true : false,
      sourceAssignments: options?.withSources ? { source: true } : false,
      model: options?.withModel ? true : false,
      knowledgeBaseAssignments: options?.withKnowledgeBases
        ? { knowledgeBase: true }
        : false,
      mcpIntegrations: true,
    };
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
    return this.assignments.updateSourceAssignments(params);
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
    return this.assignments.updateMcpIntegrations(params);
  }

  async addKnowledgeBaseAssignment(params: {
    threadId: UUID;
    userId: UUID;
    knowledgeBaseId: UUID;
    originSkillId?: UUID;
  }): Promise<void> {
    return this.assignments.addKnowledgeBaseAssignment(params);
  }

  async removeKnowledgeBaseAssignment(params: {
    threadId: UUID;
    userId: UUID;
    knowledgeBaseId: UUID;
    originSkillId?: UUID;
  }): Promise<void> {
    return this.assignments.removeKnowledgeBaseAssignment(params);
  }

  async delete(id: UUID, userId: UUID): Promise<void> {
    this.logger.log('delete', { id, userId });
    await this.threadRepository.delete({ id, userId });
  }

  async removeSourceAssignmentsByOriginSkill(params: {
    originSkillId: UUID;
    userIds: UUID[];
  }): Promise<void> {
    return this.assignments.removeSourceAssignmentsByOriginSkill(params);
  }

  async removeKnowledgeBaseAssignmentsByOriginSkill(params: {
    originSkillId: UUID;
    userIds: UUID[];
    knowledgeBaseId?: UUID;
  }): Promise<void> {
    return this.assignments.removeKnowledgeBaseAssignmentsByOriginSkill(params);
  }

  async removeDirectKnowledgeBaseAssignments(params: {
    knowledgeBaseId: UUID;
    userIds: UUID[];
  }): Promise<void> {
    return this.assignments.removeDirectKnowledgeBaseAssignments(params);
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
