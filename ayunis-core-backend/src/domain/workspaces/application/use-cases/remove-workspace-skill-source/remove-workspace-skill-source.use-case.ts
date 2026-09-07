import { Injectable, Logger } from '@nestjs/common';
import type { UUID } from 'crypto';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { UnexpectedWorkspaceError } from 'src/domain/workspaces/application/workspaces.errors';
import { GetWorkspaceSkillUseCase } from 'src/domain/workspaces/application/use-cases/get-workspace-skill/get-workspace-skill.use-case';
import { RemoveSourceFromSkillUseCase as SourceOperationUseCase } from 'src/domain/skills/application/use-cases/remove-source-from-skill/remove-source-from-skill.use-case';
@Injectable()
export class RemoveWorkspaceSkillSourceUseCase {
  private readonly logger = new Logger(RemoveWorkspaceSkillSourceUseCase.name);
  constructor(
    private readonly find: GetWorkspaceSkillUseCase,
    private readonly operation: SourceOperationUseCase,
  ) {}
  @HandleUnexpectedErrors(UnexpectedWorkspaceError)
  async execute(command: { workspaceId: UUID; skillId: UUID; sourceId: UUID }) {
    this.logger.log(
      { workspaceId: command.workspaceId },
      'remove-workspace-skill-source',
    );
    const context = await this.find.execute(command);
    await this.operation.executeForAuthorizedSkill(
      context.skill,
      command.sourceId,
    );
  }
}
