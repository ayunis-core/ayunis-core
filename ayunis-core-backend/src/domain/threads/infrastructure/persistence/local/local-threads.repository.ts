import { Thread } from 'src/domain/threads/domain/thread.entity';
import {
  ThreadsFindAllOptions,
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
        agent: {
          model: {
            model: true,
          },
          agentTools: {
            toolConfig: true,
          },
          sourceAssignments: {
            source: true,
          },
        },
        sourceAssignments: {
          source: true,
        },
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
  ): Promise<Thread[]> {
    this.logger.log('findAll', { userId });
    const threadEntities = await this.threadRepository.find({
      where: { userId },
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
      agent: options?.withAgent
        ? {
            model: {
              model: true,
            },
          }
        : false,
      model: options?.withModel ? true : false,
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

  async updateAgent(params: {
    threadId: UUID;
    userId: UUID;
    agentId: UUID;
  }): Promise<void> {
    this.logger.log('updateAgent', { params });
    const result = await this.threadRepository
      .createQueryBuilder()
      .update(ThreadRecord)
      .set({
        agentId: params.agentId,
        modelId: () => 'NULL',
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

  async delete(id: UUID, userId: UUID): Promise<void> {
    this.logger.log('delete', { id, userId });
    await this.threadRepository.delete({ id, userId });
  }
}
