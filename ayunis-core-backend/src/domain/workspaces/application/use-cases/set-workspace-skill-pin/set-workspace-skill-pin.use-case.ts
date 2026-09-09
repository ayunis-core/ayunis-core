import { Injectable, Logger } from '@nestjs/common';
import type { UUID } from 'crypto';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { UnexpectedWorkspaceError } from 'src/domain/workspaces/application/workspaces.errors';
import { WorkspaceAccessService } from 'src/domain/workspaces/application/services/workspace-access.service';
import { SetWorkspaceSkillPinUseCase as MutateSkillUseCase } from 'src/domain/skills/application/use-cases/set-workspace-skill-pin/set-workspace-skill-pin.use-case';
import { FindWorkspaceSkillUseCase } from 'src/domain/skills/application/use-cases/find-workspace-skill/find-workspace-skill.use-case';
@Injectable()
export class SetWorkspaceSkillPinUseCase {
  private readonly logger = new Logger(SetWorkspaceSkillPinUseCase.name);
  constructor(
    private readonly access: WorkspaceAccessService,
    private readonly mutate: MutateSkillUseCase,
    private readonly find: FindWorkspaceSkillUseCase,
  ) {}
  @HandleUnexpectedErrors(UnexpectedWorkspaceError)
  async execute(command: {
    workspaceId: UUID;
    skillId: UUID;
    isPinned: boolean;
  }) {
    this.logger.log(
      { workspaceId: command.workspaceId },
      'set-workspace-skill-pin',
    );
    await this.access.requireOwned(command.workspaceId);
    await this.mutate.execute(command);
    return this.find.execute(command);
  }
}
