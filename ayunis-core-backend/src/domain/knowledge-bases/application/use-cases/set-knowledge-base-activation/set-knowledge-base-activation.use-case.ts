import { Injectable, Logger } from '@nestjs/common';
import { Transactional } from '@nestjs-cls/transactional';
import { ContextService } from 'src/common/context/services/context.service';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { UnauthorizedAccessError } from 'src/common/errors/unauthorized-access.error';
import {
  KnowledgeBaseNotFoundError,
  UnexpectedKnowledgeBaseError,
} from 'src/domain/knowledge-bases/application/knowledge-bases.errors';
import { KnowledgeBaseRepository } from 'src/domain/knowledge-bases/application/ports/knowledge-base.repository';
import { KnowledgeBaseReadAccessService } from 'src/domain/knowledge-bases/application/services/knowledge-base-read-access.service';
import { KnowledgeBaseWriteAccessService } from 'src/domain/knowledge-bases/application/services/knowledge-base-write-access.service';
import type { KnowledgeBase } from 'src/domain/knowledge-bases/domain/knowledge-base';
import { HasPermissionQuery } from 'src/iam/permissions/application/use-cases/has-permission/has-permission.query';
import { HasPermissionUseCase } from 'src/iam/permissions/application/use-cases/has-permission/has-permission.use-case';
import { Permission } from 'src/iam/permissions/domain/value-objects/permission.enum';
import { PersonalKnowledgeBase } from 'src/domain/knowledge-bases/domain/personal-knowledge-base.entity';
import { SetKnowledgeBaseActivationCommand } from './set-knowledge-base-activation.command';

@Injectable()
export class SetKnowledgeBaseActivationUseCase {
  private readonly logger = new Logger(SetKnowledgeBaseActivationUseCase.name);

  constructor(
    private readonly repository: KnowledgeBaseRepository,
    private readonly readAccess: KnowledgeBaseReadAccessService,
    private readonly writeAccess: KnowledgeBaseWriteAccessService,
    private readonly context: ContextService,
    private readonly hasPermission: HasPermissionUseCase,
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
    const knowledgeBase = await this.repository.findById(
      command.knowledgeBaseId,
    );
    if (!knowledgeBase) {
      throw new KnowledgeBaseNotFoundError(command.knowledgeBaseId);
    }

    if (knowledgeBase instanceof PersonalKnowledgeBase) {
      await this.setPersonalActivation(knowledgeBase, command.isActive);
    } else {
      await this.setWorkspaceActivation(knowledgeBase, command.isActive);
    }
    return knowledgeBase;
  }

  private async setWorkspaceActivation(
    knowledgeBase: Exclude<KnowledgeBase, PersonalKnowledgeBase>,
    isActive: boolean,
  ): Promise<void> {
    await this.writeAccess.requireWrite(knowledgeBase);
    await this.requireWorkspaceManagementPermission();
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

  private async requireWorkspaceManagementPermission(): Promise<void> {
    const orgId = this.context.get('orgId');
    const role = this.context.get('role');
    if (!orgId || !role) throw new UnauthorizedAccessError();
    const allowed = await this.hasPermission.execute(
      new HasPermissionQuery(orgId, role, Permission.MANAGE_KNOWLEDGE_BASES),
    );
    if (!allowed) throw new UnauthorizedAccessError();
  }

  private async setPersonalActivation(
    knowledgeBase: PersonalKnowledgeBase,
    isActive: boolean,
  ): Promise<void> {
    await this.readAccess.requireRead(knowledgeBase);
    const userId = this.context.get('userId');
    if (!userId) throw new UnauthorizedAccessError();
    if (isActive) {
      await this.repository.activate(knowledgeBase.id, userId);
    } else {
      await this.repository.deactivate(knowledgeBase.id, userId);
    }
  }
}
