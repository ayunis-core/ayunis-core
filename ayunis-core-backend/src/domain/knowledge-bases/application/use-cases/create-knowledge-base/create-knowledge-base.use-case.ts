import { Injectable, Logger } from '@nestjs/common';
import { Transactional } from '@nestjs-cls/transactional';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { KnowledgeBaseRepository } from 'src/domain/knowledge-bases/application/ports/knowledge-base.repository';
import { KnowledgeBase } from 'src/domain/knowledge-bases/domain/knowledge-base.entity';
import { CreateKnowledgeBaseCommand } from './create-knowledge-base.command';
import { UnexpectedKnowledgeBaseError } from 'src/domain/knowledge-bases/application/knowledge-bases.errors';

@Injectable()
export class CreateKnowledgeBaseUseCase {
  private readonly logger = new Logger(CreateKnowledgeBaseUseCase.name);

  constructor(
    private readonly knowledgeBaseRepository: KnowledgeBaseRepository,
  ) {}

  @HandleUnexpectedErrors(UnexpectedKnowledgeBaseError)
  @Transactional()
  async execute(command: CreateKnowledgeBaseCommand): Promise<KnowledgeBase> {
    this.logger.log(
      {
        name: command.name,
        userId: command.userId,
      },
      'Creating knowledge base',
    );

    const knowledgeBase = new KnowledgeBase({
      name: command.name,
      description: command.description,
      orgId: command.orgId,
      userId: command.workspaceId ? null : command.userId,
      workspaceId: command.workspaceId,
    });

    const created = await this.knowledgeBaseRepository.save(knowledgeBase);
    if (!command.workspaceId) {
      await this.knowledgeBaseRepository.activate(created.id, command.userId);
    }
    return created;
  }
}
