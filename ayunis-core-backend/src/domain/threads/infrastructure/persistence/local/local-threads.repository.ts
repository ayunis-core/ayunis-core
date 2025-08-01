import { Thread } from 'src/domain/threads/domain/thread.entity';
import { ThreadsRepository } from 'src/domain/threads/application/ports/threads.repository';
import { Logger, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ThreadRecord } from './schema/thread.record';
import { ThreadMapper } from './mappers/thread.mapper';
import { UUID } from 'crypto';
import { ThreadNotFoundError } from 'src/domain/threads/application/threads.errors';

@Injectable()
export class LocalThreadsRepository extends ThreadsRepository {
  private readonly logger = new Logger(LocalThreadsRepository.name);

  constructor(
    @InjectRepository(ThreadRecord)
    private readonly threadRepository: Repository<ThreadRecord>,
    private readonly threadMapper: ThreadMapper,
  ) {
    super();
  }

  async create(thread: Thread): Promise<Thread> {
    this.logger.log('create', { thread });
    const threadEntity = this.threadMapper.toRecord(thread);
    const savedThreadEntity = await this.threadRepository.save(threadEntity);
    const reloadedThreadEntity = await this.threadRepository.findOne({
      where: { id: savedThreadEntity.id },
      relations: ['messages', 'sources', 'model'],
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
        },
      },
    });
    if (!threadEntity) {
      return null;
    }
    return this.threadMapper.toDomain(threadEntity);
  }

  async findAll(userId: UUID): Promise<Thread[]> {
    this.logger.log('findAll', { userId });
    const threadEntities = await this.threadRepository.find({
      where: { userId },
      relations: {
        messages: true,
      },
    });
    return threadEntities.map((entity) => this.threadMapper.toDomain(entity));
  }

  async findAllByModel(modelId: UUID): Promise<Thread[]> {
    this.logger.log('findAllByModel', { modelId });
    const threadEntities = await this.threadRepository.find({
      where: { modelId },
      relations: ['messages', 'model', 'agent'],
    });
    return threadEntities.map((entity) => this.threadMapper.toDomain(entity));
  }

  async findAllByAgent(agentId: UUID): Promise<Thread[]> {
    this.logger.log('findAllByAgent', { agentId });
    const threadEntities = await this.threadRepository.find({
      where: { agentId },
      relations: ['messages', 'agent'],
    });
    return threadEntities.map((entity) => this.threadMapper.toDomain(entity));
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
