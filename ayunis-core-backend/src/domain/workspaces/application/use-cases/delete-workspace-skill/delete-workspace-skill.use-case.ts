import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { ContextService } from 'src/common/context/services/context.service';
import { UnauthorizedAccessError } from 'src/common/errors/unauthorized-access.error';
import { DeleteSkillCommand } from 'src/domain/skills/application/use-cases/delete-skill/delete-skill.command';
import { DeleteSkillUseCase } from 'src/domain/skills/application/use-cases/delete-skill/delete-skill.use-case';
import { WorkspacesRepository } from 'src/domain/workspaces/application/ports/workspaces-repository.port';
import {
  UnexpectedWorkspaceError,
  WorkspaceNotFoundError,
} from 'src/domain/workspaces/application/workspaces.errors';
import { DeleteWorkspaceSkillCommand } from './delete-workspace-skill.command';

@Injectable()
export class DeleteWorkspaceSkillUseCase {
  constructor(
    @InjectPinoLogger(DeleteWorkspaceSkillUseCase.name)
    private readonly logger: PinoLogger,
    private readonly workspacesRepository: WorkspacesRepository,
    private readonly deleteSkillUseCase: DeleteSkillUseCase,
    private readonly contextService: ContextService,
  ) {}

  @HandleUnexpectedErrors(UnexpectedWorkspaceError)
  async execute(command: DeleteWorkspaceSkillCommand): Promise<void> {
    const userId = this.contextService.get('userId');
    if (!userId) throw new UnauthorizedAccessError();
    const workspace = await this.workspacesRepository.findById(
      userId,
      command.workspaceId,
    );
    if (!workspace) throw new WorkspaceNotFoundError(command.workspaceId);

    this.logger.info(
      { workspaceId: command.workspaceId, skillId: command.skillId },
      'deleteWorkspaceSkill',
    );
    await this.deleteSkillUseCase.execute(
      new DeleteSkillCommand({
        skillId: command.skillId,
        workspaceId: command.workspaceId,
      }),
    );
  }
}
