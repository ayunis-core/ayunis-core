import { forwardRef, Inject, Injectable, Logger } from '@nestjs/common';
import { Transactional } from '@nestjs-cls/transactional';
import { ContextService } from 'src/common/context/services/context.service';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { UnauthorizedAccessError } from 'src/common/errors/unauthorized-access.error';
import { UnexpectedKnowledgeBaseError } from 'src/domain/knowledge-bases/application/knowledge-bases.errors';
import { KnowledgeBaseRepository } from 'src/domain/knowledge-bases/application/ports/knowledge-base.repository';
import type { KnowledgeBase } from 'src/domain/knowledge-bases/domain/knowledge-base';
import { PersonalKnowledgeBase } from 'src/domain/knowledge-bases/domain/personal-knowledge-base.entity';
import { WorkspaceKnowledgeBase } from 'src/domain/knowledge-bases/domain/workspace-knowledge-base.entity';
import { AssertWorkspaceWriteAccessUseCase } from 'src/domain/workspaces/application/use-cases/assert-workspace-write-access/assert-workspace-write-access.use-case';
import { CreateKnowledgeBaseCommand } from './create-knowledge-base.command';

@Injectable()
export class CreateKnowledgeBaseUseCase {
  private readonly logger = new Logger(CreateKnowledgeBaseUseCase.name);

  constructor(
    private readonly repository: KnowledgeBaseRepository,
    @Inject(forwardRef(() => AssertWorkspaceWriteAccessUseCase))
    private readonly workspaceWriteAccess: AssertWorkspaceWriteAccessUseCase,
    private readonly context: ContextService,
  ) {}

  @HandleUnexpectedErrors(UnexpectedKnowledgeBaseError)
  @Transactional()
  async execute(command: CreateKnowledgeBaseCommand): Promise<KnowledgeBase> {
    this.logger.log(
      { name: command.name, ownerType: command.owner.type },
      'Creating knowledge base',
    );
    const userId = this.context.get('userId');
    const orgId = this.context.get('orgId');
    if (!userId || !orgId) throw new UnauthorizedAccessError();

    if (command.owner.type === 'workspace') {
      await this.workspaceWriteAccess.execute({
        workspaceId: command.owner.workspaceId,
      });
    }

    const params = {
      name: command.name,
      description: command.description,
      orgId,
    };
    const knowledgeBase =
      command.owner.type === 'workspace'
        ? new WorkspaceKnowledgeBase({
            ...params,
            workspaceId: command.owner.workspaceId,
          })
        : new PersonalKnowledgeBase({ ...params, userId });

    const created = await this.repository.save(knowledgeBase);
    if (created instanceof WorkspaceKnowledgeBase) {
      await this.repository.activateForWorkspace(
        created.id,
        created.workspaceId,
      );
    } else {
      await this.repository.activate(created.id, userId);
    }
    return created;
  }
}
