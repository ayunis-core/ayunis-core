import { Injectable, Logger } from '@nestjs/common';
import type { UUID } from 'crypto';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { KnowledgeBaseNotFoundError } from 'src/domain/knowledge-bases/application/knowledge-bases.errors';
import { FindKnowledgeBaseQuery } from 'src/domain/knowledge-bases/application/use-cases/find-knowledge-base/find-knowledge-base.query';
import { FindKnowledgeBaseUseCase } from 'src/domain/knowledge-bases/application/use-cases/find-knowledge-base/find-knowledge-base.use-case';
import { WorkspaceKnowledgeBase } from 'src/domain/knowledge-bases/domain/workspace-knowledge-base.entity';
import { FindWorkspaceSkillUseCase } from 'src/domain/skills/application/use-cases/find-workspace-skill/find-workspace-skill.use-case';
import { SetWorkspaceSkillKnowledgeBaseUseCase as MutateSkillUseCase } from 'src/domain/skills/application/use-cases/set-workspace-skill-knowledge-base/set-workspace-skill-knowledge-base.use-case';
import { UnexpectedWorkspaceError } from 'src/domain/workspaces/application/workspaces.errors';
import { AssertWorkspaceWriteAccessUseCase } from 'src/domain/workspaces/application/use-cases/assert-workspace-write-access/assert-workspace-write-access.use-case';

interface SetWorkspaceSkillKnowledgeBaseCommand {
  workspaceId: UUID;
  skillId: UUID;
  knowledgeBaseId: UUID;
  assigned: boolean;
}

@Injectable()
export class SetWorkspaceSkillKnowledgeBaseUseCase {
  private readonly logger = new Logger(
    SetWorkspaceSkillKnowledgeBaseUseCase.name,
  );

  constructor(
    private readonly access: AssertWorkspaceWriteAccessUseCase,
    private readonly mutate: MutateSkillUseCase,
    private readonly find: FindWorkspaceSkillUseCase,
    private readonly findKnowledgeBase: FindKnowledgeBaseUseCase,
  ) {}

  @HandleUnexpectedErrors(UnexpectedWorkspaceError)
  async execute(command: SetWorkspaceSkillKnowledgeBaseCommand) {
    this.logger.log(
      { workspaceId: command.workspaceId },
      'set-workspace-skill-knowledge-base',
    );
    await this.access.execute({ workspaceId: command.workspaceId });
    if (command.assigned) await this.assertKnowledgeBaseOwner(command);
    await this.mutate.execute(command);
    return this.find.execute(command);
  }

  private async assertKnowledgeBaseOwner(
    command: SetWorkspaceSkillKnowledgeBaseCommand,
  ): Promise<void> {
    const { knowledgeBase } = await this.findKnowledgeBase.execute(
      new FindKnowledgeBaseQuery(command.knowledgeBaseId),
    );
    if (
      !(knowledgeBase instanceof WorkspaceKnowledgeBase) ||
      knowledgeBase.workspaceId !== command.workspaceId
    ) {
      throw new KnowledgeBaseNotFoundError(command.knowledgeBaseId);
    }
  }
}
