import { Injectable, Logger } from '@nestjs/common';
import { KnowledgeBaseRepository } from '../../ports/knowledge-base.repository';
import { KnowledgeBase } from '../../../domain/knowledge-base.entity';
import { UpdateKnowledgeBaseCommand } from './update-knowledge-base.command';
import {
  KnowledgeBaseNotFoundError,
  UnexpectedKnowledgeBaseError,
} from '../../knowledge-bases.errors';
import { ApplicationError } from 'src/common/errors/base.error';

@Injectable()
export class UpdateKnowledgeBaseUseCase {
  private readonly logger = new Logger(UpdateKnowledgeBaseUseCase.name);

  constructor(
    private readonly knowledgeBaseRepository: KnowledgeBaseRepository,
  ) {}

  async execute(command: UpdateKnowledgeBaseCommand): Promise<KnowledgeBase> {
    this.logger.log('Updating knowledge base', {
      knowledgeBaseId: command.knowledgeBaseId,
      userId: command.userId,
    });

    try {
      const existing = await this.knowledgeBaseRepository.findById(
        command.knowledgeBaseId,
      );
      if (existing?.userId !== command.userId) {
        throw new KnowledgeBaseNotFoundError(command.knowledgeBaseId);
      }

      const updated = new KnowledgeBase({
        id: existing.id,
        name: command.name ?? existing.name,
        description: command.description ?? existing.description,
        orgId: existing.orgId,
        userId: existing.userId,
        createdAt: existing.createdAt,
        updatedAt: new Date(),
      });

      return await this.knowledgeBaseRepository.save(updated);
    } catch (error) {
      if (error instanceof ApplicationError) {
        throw error;
      }
      this.logger.error('Error updating knowledge base', {
        error: error as Error,
      });
      throw new UnexpectedKnowledgeBaseError('Error updating knowledge base', {
        error: error as Error,
      });
    }
  }
}
