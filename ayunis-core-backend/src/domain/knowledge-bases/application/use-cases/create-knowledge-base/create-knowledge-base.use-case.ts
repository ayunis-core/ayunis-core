import { Injectable, Logger } from '@nestjs/common';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { KnowledgeBaseRepository } from '../../ports/knowledge-base.repository';
import { KnowledgeBase } from '../../../domain/knowledge-base.entity';
import { CreateKnowledgeBaseCommand } from './create-knowledge-base.command';
import { UnexpectedKnowledgeBaseError } from '../../knowledge-bases.errors';

@Injectable()
export class CreateKnowledgeBaseUseCase {
  private readonly logger = new Logger(CreateKnowledgeBaseUseCase.name);

  constructor(
    private readonly knowledgeBaseRepository: KnowledgeBaseRepository,
  ) {}

  @HandleUnexpectedErrors(UnexpectedKnowledgeBaseError)
  async execute(command: CreateKnowledgeBaseCommand): Promise<KnowledgeBase> {
    this.logger.log('Creating knowledge base', {
      name: command.name,
      userId: command.userId,
    });

    const knowledgeBase = new KnowledgeBase({
      name: command.name,
      description: command.description,
      orgId: command.orgId,
      userId: command.userId,
    });

    return await this.knowledgeBaseRepository.save(knowledgeBase);
  }
}
