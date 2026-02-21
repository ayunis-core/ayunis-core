import { Injectable, Logger } from '@nestjs/common';
import { KnowledgeBaseRepository } from '../../ports/knowledge-base.repository';
import { KnowledgeBase } from '../../../domain/knowledge-base.entity';
import { CreateKnowledgeBaseCommand } from './create-knowledge-base.command';
import { ApplicationError } from 'src/common/errors/base.error';
import { UnexpectedKnowledgeBaseError } from '../../knowledge-bases.errors';

@Injectable()
export class CreateKnowledgeBaseUseCase {
  private readonly logger = new Logger(CreateKnowledgeBaseUseCase.name);

  constructor(
    private readonly knowledgeBaseRepository: KnowledgeBaseRepository,
  ) {}

  async execute(command: CreateKnowledgeBaseCommand): Promise<KnowledgeBase> {
    this.logger.log('Creating knowledge base', {
      name: command.name,
      userId: command.userId,
    });

    try {
      const knowledgeBase = new KnowledgeBase({
        name: command.name,
        description: command.description,
        orgId: command.orgId,
        userId: command.userId,
      });

      return await this.knowledgeBaseRepository.save(knowledgeBase);
    } catch (error) {
      if (error instanceof ApplicationError) {
        throw error;
      }
      this.logger.error('Error creating knowledge base', {
        error: error as Error,
      });
      throw new UnexpectedKnowledgeBaseError('Error creating knowledge base', {
        error: error as Error,
      });
    }
  }
}
