import { Injectable, Logger } from '@nestjs/common';
import { ThreadsRepository } from '../../ports/threads.repository';
import { AddKnowledgeBaseToThreadCommand } from './add-knowledge-base-to-thread.command';
import { ContextService } from 'src/common/context/services/context.service';
import { ThreadNotFoundError } from '../../threads.errors';
import { UnauthorizedAccessError } from 'src/common/errors/unauthorized-access.error';
import { KnowledgeBaseRepository } from 'src/domain/knowledge-bases/application/ports/knowledge-base.repository';
import { KnowledgeBaseNotFoundError } from 'src/domain/knowledge-bases/application/knowledge-bases.errors';

@Injectable()
export class AddKnowledgeBaseToThreadUseCase {
  private readonly logger = new Logger(AddKnowledgeBaseToThreadUseCase.name);

  constructor(
    private readonly threadsRepository: ThreadsRepository,
    private readonly knowledgeBaseRepository: KnowledgeBaseRepository,
    private readonly contextService: ContextService,
  ) {}

  async execute(command: AddKnowledgeBaseToThreadCommand): Promise<void> {
    this.logger.log('execute', {
      threadId: command.threadId,
      knowledgeBaseId: command.knowledgeBaseId,
      originSkillId: command.originSkillId,
    });

    const userId = this.contextService.get('userId');
    if (!userId) {
      throw new UnauthorizedAccessError();
    }

    const orgId = this.contextService.get('orgId');
    if (!orgId) {
      throw new UnauthorizedAccessError();
    }

    const thread = await this.threadsRepository.findOne(
      command.threadId,
      userId,
    );

    if (!thread) {
      throw new ThreadNotFoundError(command.threadId, userId);
    }

    const knowledgeBase = await this.knowledgeBaseRepository.findById(
      command.knowledgeBaseId,
    );

    if (!knowledgeBase) {
      throw new KnowledgeBaseNotFoundError(command.knowledgeBaseId);
    }

    if (knowledgeBase.orgId !== orgId) {
      throw new KnowledgeBaseNotFoundError(command.knowledgeBaseId);
    }

    const currentAssignments = thread.knowledgeBaseAssignments ?? [];
    const alreadyAssigned = currentAssignments.some(
      (a) =>
        a.knowledgeBase.id === command.knowledgeBaseId &&
        a.originSkillId === command.originSkillId,
    );

    if (alreadyAssigned) {
      return;
    }

    await this.threadsRepository.addKnowledgeBaseAssignment({
      threadId: command.threadId,
      userId,
      knowledgeBaseId: command.knowledgeBaseId,
      originSkillId: command.originSkillId,
    });
  }
}
