import { Injectable, Logger } from '@nestjs/common';
import type { UUID } from 'crypto';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { UnexpectedWorkspaceError } from 'src/domain/workspaces/application/workspaces.errors';
import { WorkspaceAccessService } from 'src/domain/workspaces/application/services/workspace-access.service';
import { FindWorkspaceSkillUseCase } from 'src/domain/skills/application/use-cases/find-workspace-skill/find-workspace-skill.use-case';
@Injectable()
export class GetWorkspaceSkillUseCase {
  private readonly logger = new Logger(GetWorkspaceSkillUseCase.name);
  constructor(
    private readonly access: WorkspaceAccessService,
    private readonly find: FindWorkspaceSkillUseCase,
  ) {}
  @HandleUnexpectedErrors(UnexpectedWorkspaceError)
  async execute(command: { workspaceId: UUID; skillId: UUID }) {
    this.logger.log(
      { workspaceId: command.workspaceId },
      'get-workspace-skill',
    );
    await this.access.requireOwned(command.workspaceId);
    return this.find.execute(command);
  }
}
