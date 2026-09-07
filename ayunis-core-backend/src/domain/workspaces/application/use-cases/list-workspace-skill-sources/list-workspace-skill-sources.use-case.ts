import { Injectable, Logger } from '@nestjs/common';
import type { UUID } from 'crypto';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { UnexpectedWorkspaceError } from 'src/domain/workspaces/application/workspaces.errors';
import { GetWorkspaceSkillUseCase } from 'src/domain/workspaces/application/use-cases/get-workspace-skill/get-workspace-skill.use-case';
import { ListSkillSourcesUseCase as SourceOperationUseCase } from 'src/domain/skills/application/use-cases/list-skill-sources/list-skill-sources.use-case';
@Injectable()
export class ListWorkspaceSkillSourcesUseCase {
  private readonly logger = new Logger(ListWorkspaceSkillSourcesUseCase.name);
  constructor(
    private readonly find: GetWorkspaceSkillUseCase,
    private readonly operation: SourceOperationUseCase,
  ) {}
  @HandleUnexpectedErrors(UnexpectedWorkspaceError)
  async execute(command: { workspaceId: UUID; skillId: UUID }) {
    this.logger.log(
      { workspaceId: command.workspaceId },
      'list-workspace-skill-sources',
    );
    const context = await this.find.execute(command);
    return this.operation.executeForAuthorizedSkill(context.skill);
  }
}
