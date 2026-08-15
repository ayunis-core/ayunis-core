import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { KnowledgeBaseRepository } from '../../ports/knowledge-base.repository';
import { KnowledgeBase } from 'src/domain/knowledge-bases/domain/knowledge-base.entity';
import { CreateKnowledgeBaseCommand } from './create-knowledge-base.command';
import { ApplicationError } from 'src/common/errors/base.error';
import { UnexpectedKnowledgeBaseError } from '../../knowledge-bases.errors';

@Injectable()
export class CreateKnowledgeBaseUseCase {
  constructor(
    @InjectPinoLogger(CreateKnowledgeBaseUseCase.name)
    private readonly logger: PinoLogger,
    private readonly knowledgeBaseRepository: KnowledgeBaseRepository,
  ) {}

  async execute(command: CreateKnowledgeBaseCommand): Promise<KnowledgeBase> {
    this.logger.info(
      {
        name: command.name,
        userId: command.userId,
      },
      'Creating knowledge base',
    );

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
      this.logger.error(
        {
          err: error as Error,
        },
        'Error creating knowledge base',
      );
      throw new UnexpectedKnowledgeBaseError('Error creating knowledge base', {
        err: error as Error,
      });
    }
  }
}
