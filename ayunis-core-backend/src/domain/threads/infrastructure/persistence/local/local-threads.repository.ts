import { Thread } from 'src/domain/threads/domain/thread.entity';
import { ThreadsRepository } from 'src/domain/threads/application/ports/threads.repository';
import { Logger, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ThreadRecord } from './schema/thread.record';
import { ThreadMapper } from './mappers/thread.mapper';
import { UUID } from 'crypto';
import { ThreadNotFoundError } from 'src/domain/threads/application/threads.errors';
import { PermittedModel } from 'src/domain/models/domain/permitted-model.entity';

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
    const threadEntity = this.threadMapper.toEntity(thread);
    const savedThreadEntity = await this.threadRepository.save(threadEntity);
    return this.threadMapper.toDomain(savedThreadEntity);
  }

  async findOne(id: UUID, userId: UUID): Promise<Thread | null> {
    this.logger.log('findOne', { id, userId });
    const threadEntity = await this.threadRepository.findOne({
      where: { id, userId },
      relations: ['messages', 'sources', 'model'],
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
      relations: ['messages', 'model'],
    });
    return threadEntities.map((entity) => this.threadMapper.toDomain(entity));
  }

  async update(thread: Thread): Promise<Thread> {
    this.logger.log('update', { threadId: thread.id });
    const threadEntity = this.threadMapper.toEntity(thread);
    const savedThreadEntity = await this.threadRepository.save(threadEntity);
    return this.threadMapper.toDomain(savedThreadEntity);
  }

  async updateTitle(id: UUID, userId: UUID, title: string): Promise<void> {
    this.logger.log('updateTitle', { id, userId, title });
    const result = await this.threadRepository.update(
      { id, userId },
      { title },
    );
    if (result.affected === 0) {
      throw new ThreadNotFoundError(id, userId);
    }
  }

  async updateInstruction(
    id: UUID,
    userId: UUID,
    instruction: string,
  ): Promise<void> {
    this.logger.log('updateInstruction', { id, userId, instruction });
    const result = await this.threadRepository.update(
      { id, userId },
      { instruction },
    );
    if (result.affected === 0) {
      throw new ThreadNotFoundError(id, userId);
    }
  }

  async updateModel(
    id: UUID,
    userId: UUID,
    model: PermittedModel,
  ): Promise<void> {
    this.logger.log('updateModel', {
      id,
      userId,
      modelId: model.id,
    });
    const result = await this.threadRepository.update(
      { id, userId },
      { modelId: model.id },
    );
    if (!result.affected || result.affected === 0) {
      throw new ThreadNotFoundError(id, userId);
    }
  }

  async updateInternetSearch(
    id: UUID,
    userId: UUID,
    isInternetSearchEnabled: boolean,
  ): Promise<void> {
    this.logger.log('updateInternetSearch', {
      id,
      userId,
      isInternetSearchEnabled,
    });
    const result = await this.threadRepository.update(
      { id, userId },
      { isInternetSearchEnabled },
    );
    if (!result.affected || result.affected === 0) {
      throw new ThreadNotFoundError(id, userId);
    }
  }

  async delete(id: UUID, userId: UUID): Promise<void> {
    this.logger.log('delete', { id, userId });
    await this.threadRepository.delete({ id, userId });
  }
}
