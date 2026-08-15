import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { KnowledgeBaseRepository } from '../../ports/knowledge-base.repository';
import { KnowledgeBase } from 'src/domain/knowledge-bases/domain/knowledge-base.entity';
import { UpdateKnowledgeBaseCommand } from './update-knowledge-base.command';
import {
  KnowledgeBaseNotFoundError,
  UnexpectedKnowledgeBaseError,
} from '../../knowledge-bases.errors';
import { ApplicationError } from 'src/common/errors/base.error';

@Injectable()
export class UpdateKnowledgeBaseUseCase {
  constructor(
    @InjectPinoLogger(UpdateKnowledgeBaseUseCase.name)
    private readonly logger: PinoLogger,
    private readonly knowledgeBaseRepository: KnowledgeBaseRepository,
  ) {}

  async execute(command: UpdateKnowledgeBaseCommand): Promise<KnowledgeBase> {
    this.logger.info(
      {
        knowledgeBaseId: command.knowledgeBaseId,
        userId: command.userId,
      },
      'Updating knowledge base',
    );

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
      this.logger.error(
        {
          err: error as Error,
        },
        'Error updating knowledge base',
      );
      throw new UnexpectedKnowledgeBaseError('Error updating knowledge base', {
        err: error as Error,
      });
    }
  }
}
