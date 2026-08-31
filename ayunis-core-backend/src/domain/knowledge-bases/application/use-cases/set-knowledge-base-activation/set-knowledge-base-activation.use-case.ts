import { Injectable, Logger } from '@nestjs/common';
import { Transactional } from '@nestjs-cls/transactional';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { ContextService } from 'src/common/context/services/context.service';
import type { KnowledgeBase } from 'src/domain/knowledge-bases/domain/knowledge-base.entity';
import { UnexpectedKnowledgeBaseError } from 'src/domain/knowledge-bases/application/knowledge-bases.errors';
import { KnowledgeBaseRepository } from 'src/domain/knowledge-bases/application/ports/knowledge-base.repository';
import { KnowledgeBaseAccessService } from 'src/domain/knowledge-bases/application/services/knowledge-base-access.service';
import { SetKnowledgeBaseActivationCommand } from './set-knowledge-base-activation.command';

@Injectable()
export class SetKnowledgeBaseActivationUseCase {
  private readonly logger = new Logger(SetKnowledgeBaseActivationUseCase.name);

  constructor(
    private readonly knowledgeBaseRepository: KnowledgeBaseRepository,
    private readonly knowledgeBaseAccessService: KnowledgeBaseAccessService,
    private readonly contextService: ContextService,
  ) {}

  @HandleUnexpectedErrors(UnexpectedKnowledgeBaseError)
  @Transactional()
  async execute(
    command: SetKnowledgeBaseActivationCommand,
  ): Promise<KnowledgeBase> {
    this.logger.log(
      {
        knowledgeBaseId: command.knowledgeBaseId,
        isActive: command.isActive,
      },
      'Setting knowledge base activation',
    );
    const userId = this.contextService.get('userId')!;
    const knowledgeBase =
      await this.knowledgeBaseAccessService.findAccessibleKnowledgeBase(
        command.knowledgeBaseId,
      );
    if (command.isActive) {
      await this.knowledgeBaseRepository.activate(
        command.knowledgeBaseId,
        userId,
      );
    } else {
      await this.knowledgeBaseRepository.deactivate(
        command.knowledgeBaseId,
        userId,
      );
    }
    return knowledgeBase;
  }
}
