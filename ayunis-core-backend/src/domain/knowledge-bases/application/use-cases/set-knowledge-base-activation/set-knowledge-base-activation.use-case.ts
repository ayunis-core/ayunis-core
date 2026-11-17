import { Injectable, Logger } from '@nestjs/common';
import { Transactional } from '@nestjs-cls/transactional';
import { ContextService } from 'src/common/context/services/context.service';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import {
  KnowledgeBaseNotFoundError,
  UnexpectedKnowledgeBaseError,
} from 'src/domain/knowledge-bases/application/knowledge-bases.errors';
import { KnowledgeBaseRepository } from 'src/domain/knowledge-bases/application/ports/knowledge-base.repository';
import { KnowledgeBaseReadAccessService } from 'src/domain/knowledge-bases/application/services/knowledge-base-read-access.service';
import { KnowledgeBaseWriteAccessService } from 'src/domain/knowledge-bases/application/services/knowledge-base-write-access.service';
import type { KnowledgeBase } from 'src/domain/knowledge-bases/domain/knowledge-base';
import { PersonalKnowledgeBase } from 'src/domain/knowledge-bases/domain/personal-knowledge-base.entity';
import { SetKnowledgeBaseActivationCommand } from './set-knowledge-base-activation.command';
import { getRequiredUserContext } from 'src/common/context/required-context';
import { AbstractCollectiveKnowledgeBase } from 'src/domain/knowledge-bases/domain/collective-knowledge-base.entity';
import type { WorkspaceKnowledgeBase } from 'src/domain/knowledge-bases/domain/workspace-knowledge-base.entity';

@Injectable()
export class SetKnowledgeBaseActivationUseCase {
  private readonly logger = new Logger(SetKnowledgeBaseActivationUseCase.name);

  constructor(
    private readonly repository: KnowledgeBaseRepository,
    private readonly readAccess: KnowledgeBaseReadAccessService,
    private readonly writeAccess: KnowledgeBaseWriteAccessService,
    private readonly context: ContextService,
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
    // The lock keeps a concurrent owner change from being overwritten.
    const knowledgeBase = await this.repository.findById(
      command.knowledgeBaseId,
      { lock: true },
    );
    if (!knowledgeBase) {
      throw new KnowledgeBaseNotFoundError(command.knowledgeBaseId);
    }

    if (knowledgeBase instanceof AbstractCollectiveKnowledgeBase) {
      await this.writeAccess.requireWrite(knowledgeBase);
      knowledgeBase.isActive = command.isActive;
      knowledgeBase.updatedAt = new Date();
      return this.repository.save(knowledgeBase);
    }
    if (knowledgeBase instanceof PersonalKnowledgeBase) {
      await this.setPersonalActivation(knowledgeBase, command.isActive);
    } else {
      await this.setWorkspaceActivation(knowledgeBase, command.isActive);
    }
    return knowledgeBase;
  }

  private async setWorkspaceActivation(
    knowledgeBase: WorkspaceKnowledgeBase,
    isActive: boolean,
  ): Promise<void> {
    await this.writeAccess.requireWrite(knowledgeBase);
    if (isActive) {
      await this.repository.activateForWorkspace(
        knowledgeBase.id,
        knowledgeBase.workspaceId,
      );
    } else {
      await this.repository.deactivateForWorkspace(
        knowledgeBase.id,
        knowledgeBase.workspaceId,
      );
    }
  }

  private async setPersonalActivation(
    knowledgeBase: PersonalKnowledgeBase,
    isActive: boolean,
  ): Promise<void> {
    await this.readAccess.requireRead(knowledgeBase);
    const { userId } = getRequiredUserContext(this.context);
    if (isActive) {
      await this.repository.activate(knowledgeBase.id, userId);
    } else {
      await this.repository.deactivate(knowledgeBase.id, userId);
    }
  }
}
