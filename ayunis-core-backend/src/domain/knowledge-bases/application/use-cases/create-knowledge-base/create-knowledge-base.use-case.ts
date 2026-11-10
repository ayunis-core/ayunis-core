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
import { getRequiredUserContext } from 'src/common/context/required-context';
import type { UUID } from 'crypto';
import { TeamKnowledgeBase } from 'src/domain/knowledge-bases/domain/team-knowledge-base.entity';
import { OrgKnowledgeBase } from 'src/domain/knowledge-bases/domain/org-knowledge-base.entity';
import { KnowledgeBaseWriteAccessService } from 'src/domain/knowledge-bases/application/services/knowledge-base-write-access.service';

@Injectable()
export class CreateKnowledgeBaseUseCase {
  private readonly logger = new Logger(CreateKnowledgeBaseUseCase.name);

  constructor(
    private readonly repository: KnowledgeBaseRepository,
    @Inject(forwardRef(() => AssertWorkspaceWriteAccessUseCase))
    private readonly workspaceWriteAccess: AssertWorkspaceWriteAccessUseCase,
    private readonly context: ContextService,
    private readonly writeAccess: KnowledgeBaseWriteAccessService,
  ) {}

  @HandleUnexpectedErrors(UnexpectedKnowledgeBaseError)
  @Transactional()
  async execute(command: CreateKnowledgeBaseCommand): Promise<KnowledgeBase> {
    this.logger.log(
      { name: command.name, ownerType: command.owner.type },
      'Creating knowledge base',
    );
    const { userId, orgId } = getRequiredUserContext(this.context);

    if (command.owner.type === 'workspace') {
      await this.workspaceWriteAccess.execute({
        workspaceId: command.owner.workspaceId,
      });
    }

    const knowledgeBase = this.createEntity(command, userId, orgId);
    if (!(knowledgeBase instanceof WorkspaceKnowledgeBase)) {
      await this.writeAccess.requireCreate(knowledgeBase);
    }

    const created = await this.repository.save(knowledgeBase);
    await this.activate(created, userId);
    return created;
  }

  /** Team and org knowledge bases carry their (global) state themselves. */
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
    switch (command.owner.type) {
      case 'workspace':
        return new WorkspaceKnowledgeBase({
          ...params,
          workspaceId: command.owner.workspaceId,
        });
      case 'team':
        return new TeamKnowledgeBase({
          ...params,
          teamId: command.owner.teamId,
          isActive: true,
        });
      case 'org':
        return new OrgKnowledgeBase({ ...params, isActive: true });
      case 'personal':
        return new PersonalKnowledgeBase({ ...params, userId });
    }
  }
}
