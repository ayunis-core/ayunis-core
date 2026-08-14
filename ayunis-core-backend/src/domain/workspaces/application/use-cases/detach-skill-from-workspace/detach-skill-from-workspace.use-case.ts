import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { ContextService } from 'src/common/context/services/context.service';
import { UnauthorizedAccessError } from 'src/common/errors/unauthorized-access.error';
import { WorkspacesRepository } from '../../ports/workspaces-repository.port';
import {
  UnexpectedWorkspaceError,
  WorkspaceNotFoundError,
} from '../../workspaces.errors';
import { DetachSkillFromWorkspaceCommand } from './detach-skill-from-workspace.command';

@Injectable()
export class DetachSkillFromWorkspaceUseCase {
  constructor(
    @InjectPinoLogger(DetachSkillFromWorkspaceUseCase.name)
    private readonly logger: PinoLogger,
    private readonly workspacesRepository: WorkspacesRepository,
    private readonly contextService: ContextService,
  ) {}

  @HandleUnexpectedErrors(UnexpectedWorkspaceError)
  async execute(command: DetachSkillFromWorkspaceCommand): Promise<void> {
    this.logger.info(
      {
        workspaceId: command.workspaceId,
        skillId: command.skillId,
      },
      'detachSkillFromWorkspace',
    );
    const userId = this.contextService.get('userId');
    if (!userId) throw new UnauthorizedAccessError();

    const workspace = await this.workspacesRepository.findById(
      userId,
      command.workspaceId,
    );
    if (!workspace) throw new WorkspaceNotFoundError(command.workspaceId);

    await this.workspacesRepository.detachSkill(
      command.workspaceId,
      command.skillId,
    );
  }
}
