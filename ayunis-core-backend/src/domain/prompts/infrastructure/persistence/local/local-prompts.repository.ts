import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UUID } from 'crypto';
import { Prompt } from '../../../domain/prompt.entity';
import { PromptsRepository } from '../../../application/ports/prompts.repository';
import { PromptRecord } from './schema/prompt.record';
import { PromptMapper } from './mappers/prompt.mapper';

@Injectable()
export class LocalPromptsRepository extends PromptsRepository {
  private readonly logger = new Logger(LocalPromptsRepository.name);

  constructor(
    @InjectRepository(PromptRecord)
    private readonly promptEntityRepository: Repository<PromptRecord>,
    private readonly promptMapper: PromptMapper,
  ) {
    super();
  }

  async create(prompt: Prompt): Promise<Prompt> {
    this.logger.log('create', { id: prompt.id, userId: prompt.userId });

    const entity = this.promptMapper.toEntity(prompt);
    const savedEntity = await this.promptEntityRepository.save(entity);
    return this.promptMapper.toDomain(savedEntity);
  }

  async findOne(id: UUID, userId: UUID): Promise<Prompt | null> {
    this.logger.log('findOne', { id, userId });

    const entity = await this.promptEntityRepository.findOne({
      where: { id, userId },
    });

    return entity ? this.promptMapper.toDomain(entity) : null;
  }

  async findAllByUser(userId: UUID): Promise<Prompt[]> {
    this.logger.log('findAllByUser', { userId });

    const entities = await this.promptEntityRepository.find({
      where: { userId },
      order: { updatedAt: 'DESC' },
    });

    return this.promptMapper.toDomainArray(entities);
  }

  async update(prompt: Prompt): Promise<Prompt> {
    this.logger.log('update', { id: prompt.id, userId: prompt.userId });

    const entity = this.promptMapper.toEntity(prompt);
    const savedEntity = await this.promptEntityRepository.save(entity);
    return this.promptMapper.toDomain(savedEntity);
  }

  async delete(id: UUID, userId: UUID): Promise<void> {
    this.logger.log('delete', { id, userId });

    await this.promptEntityRepository.delete({ id, userId });
  }
}
