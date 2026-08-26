import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { SkillAccessService } from 'src/domain/skills/application/services/skill-access.service';
import { WorkspacesRepository } from 'src/domain/workspaces/application/ports/workspaces-repository.port';
import { WorkspaceAccessService } from 'src/domain/workspaces/application/services/workspace-access.service';
import { UnexpectedWorkspaceError } from 'src/domain/workspaces/application/workspaces.errors';
import { WorkspaceAccessLevel } from 'src/domain/workspaces/domain/value-objects/workspace-access-level.enum';
import { AttachSkillToWorkspaceCommand } from './attach-skill-to-workspace.command';

@Injectable()
export class AttachSkillToWorkspaceUseCase {
  constructor(
    @InjectPinoLogger(AttachSkillToWorkspaceUseCase.name)
    private readonly logger: PinoLogger,
    private readonly workspacesRepository: WorkspacesRepository,
    private readonly skillAccessService: SkillAccessService,
    private readonly accessService: WorkspaceAccessService,
  ) {}

  @HandleUnexpectedErrors(UnexpectedWorkspaceError)
  async execute(command: AttachSkillToWorkspaceCommand): Promise<void> {
    this.logger.info(
      { workspaceId: command.workspaceId, skillId: command.skillId },
      'attachSkillToWorkspace',
    );
    await this.accessService.requireAccessLevel(
      command.workspaceId,
      WorkspaceAccessLevel.EDIT,
    );
    await this.skillAccessService.findAccessibleSkill(command.skillId);
    await this.workspacesRepository.attachSkill(
      command.workspaceId,
      command.skillId,
    );
  }
}
