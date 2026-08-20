import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { ContextService } from 'src/common/context/services/context.service';
import { UnauthorizedAccessError } from 'src/common/errors/unauthorized-access.error';
import { WorkspacesRepository } from '../../ports/workspaces-repository.port';
import {
  WorkspaceNotFoundError,
  UnexpectedWorkspaceError,
} from '../../workspaces.errors';
import { SkillAccessService } from 'src/domain/skills/application/services/skill-access.service';
import { AttachSkillToWorkspaceCommand } from './attach-skill-to-workspace.command';

@Injectable()
export class AttachSkillToWorkspaceUseCase {
  constructor(
    @InjectPinoLogger(AttachSkillToWorkspaceUseCase.name)
    private readonly logger: PinoLogger,
    private readonly workspacesRepository: WorkspacesRepository,
    private readonly skillAccessService: SkillAccessService,
    private readonly contextService: ContextService,
  ) {}

  @HandleUnexpectedErrors(UnexpectedWorkspaceError)
  async execute(command: AttachSkillToWorkspaceCommand): Promise<void> {
    this.logger.info(
      {
        workspaceId: command.workspaceId,
        skillId: command.skillId,
      },
      'attachSkillToWorkspace',
    );
    const userId = this.contextService.get('userId');
    if (!userId) throw new UnauthorizedAccessError();

    const workspace = await this.workspacesRepository.findById(
      userId,
      command.workspaceId,
    );
    if (!workspace) throw new WorkspaceNotFoundError(command.workspaceId);

    await this.skillAccessService.findAccessibleSkill(command.skillId);
    await this.workspacesRepository.attachSkill(
      command.workspaceId,
      command.skillId,
    );
  }
}
