import { forwardRef, Inject, Injectable, Logger } from '@nestjs/common';
import { Transactional } from '@nestjs-cls/transactional';
import { ContextService } from 'src/common/context/services/context.service';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { UnexpectedKnowledgeBaseError } from 'src/domain/knowledge-bases/application/knowledge-bases.errors';
import { KnowledgeBaseRepository } from 'src/domain/knowledge-bases/application/ports/knowledge-base.repository';
import type { KnowledgeBase } from 'src/domain/knowledge-bases/domain/knowledge-base';
import { PersonalKnowledgeBase } from 'src/domain/knowledge-bases/domain/personal-knowledge-base.entity';
import { WorkspaceKnowledgeBase } from 'src/domain/knowledge-bases/domain/workspace-knowledge-base.entity';
import { AssertWorkspaceWriteAccessUseCase } from 'src/domain/workspaces/application/use-cases/assert-workspace-write-access/assert-workspace-write-access.use-case';
import { CreateKnowledgeBaseCommand } from './create-knowledge-base.command';
import type { UUID } from 'crypto';
import { TeamKnowledgeBase } from 'src/domain/knowledge-bases/domain/team-knowledge-base.entity';
import { OrgKnowledgeBase } from 'src/domain/knowledge-bases/domain/org-knowledge-base.entity';
import {
  collectiveOwnerOfKnowledgeBase,
  isCollectiveKnowledgeBase,
} from 'src/domain/knowledge-bases/application/models/collective-knowledge-base-owner';
import { GetOwnershipViewerUseCase } from 'src/domain/ownership/application/use-cases/get-ownership-viewer/get-ownership-viewer.use-case';
import { UnauthorizedAccessError } from 'src/common/errors/unauthorized-access.error';
import { HasPermissionUseCase } from 'src/iam/permissions/application/use-cases/has-permission/has-permission.use-case';
import { HasPermissionQuery } from 'src/iam/permissions/application/use-cases/has-permission/has-permission.query';
import { Permission } from 'src/iam/permissions/domain/value-objects/permission.enum';
import { getRequiredUserContext } from 'src/common/context/required-context';

@Injectable()
export class CreateKnowledgeBaseUseCase {
  private readonly logger = new Logger(CreateKnowledgeBaseUseCase.name);

  constructor(
    private readonly repository: KnowledgeBaseRepository,
    @Inject(forwardRef(() => AssertWorkspaceWriteAccessUseCase))
    private readonly workspaceWriteAccess: AssertWorkspaceWriteAccessUseCase,
    private readonly context: ContextService,
    private readonly getViewer: GetOwnershipViewerUseCase,
    private readonly hasPermission: HasPermissionUseCase,
  ) {}

  @HandleUnexpectedErrors(UnexpectedKnowledgeBaseError)
  @Transactional()
  async execute(command: CreateKnowledgeBaseCommand): Promise<KnowledgeBase> {
    this.logger.log(
      { name: command.name, ownerType: command.owner.type },
      'Creating knowledge base',
    );
    const { userId, orgId } = getRequiredUserContext(this.context);
    const knowledgeBase = this.createEntity(command, userId, orgId);
    await this.authorizeCreate(knowledgeBase);
    const created = await this.repository.save(knowledgeBase);
    await this.activate(created, userId);
    return created;
  }

  private createEntity(
    command: CreateKnowledgeBaseCommand,
    userId: UUID,
    orgId: UUID,
  ): KnowledgeBase {
    const params = {
      name: command.name,
      description: command.description,
      orgId,
    };
    const { owner } = command;
    switch (owner.type) {
      case 'workspace':
        return new WorkspaceKnowledgeBase({
          ...params,
          workspaceId: owner.workspaceId,
        });
      case 'team':
        return new TeamKnowledgeBase({ ...params, teamId: owner.teamId });
      case 'org':
        return new OrgKnowledgeBase(params);
      case 'personal':
        return new PersonalKnowledgeBase({ ...params, userId });
    }
  }

  private async authorizeCreate(knowledgeBase: KnowledgeBase): Promise<void> {
    if (isCollectiveKnowledgeBase(knowledgeBase)) {
      const viewer = await this.getViewer.execute();
      const owner = collectiveOwnerOfKnowledgeBase(knowledgeBase);
      if (!viewer.mayCreateFor('knowledge_base', owner)) {
        throw new UnauthorizedAccessError();
      }
      return;
    }
    if (knowledgeBase instanceof WorkspaceKnowledgeBase) {
      await this.workspaceWriteAccess.execute({
        workspaceId: knowledgeBase.workspaceId,
      });
    }
    const { orgId, role } = getRequiredUserContext(this.context);
    const allowed = await this.hasPermission.execute(
      new HasPermissionQuery(orgId, role, Permission.MANAGE_OWN_KNOWLEDGE),
    );
    if (!allowed) throw new UnauthorizedAccessError();
  }

  private async activate(
    knowledgeBase: KnowledgeBase,
    userId: UUID,
  ): Promise<void> {
    if (knowledgeBase instanceof WorkspaceKnowledgeBase) {
      await this.repository.activateForWorkspace(
        knowledgeBase.id,
        knowledgeBase.workspaceId,
      );
    } else if (knowledgeBase instanceof PersonalKnowledgeBase) {
      await this.repository.activate(knowledgeBase.id, userId);
    }
  }
}
