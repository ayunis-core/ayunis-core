import type { WorkspaceSkillContext } from 'src/domain/workspaces/domain/workspace-run-context.entity';
import { WorkspaceSkill } from 'src/domain/skills/domain/workspace-skill.entity';
import { Injectable, Logger } from '@nestjs/common';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { ContextService } from 'src/common/context/services/context.service';
import { UnauthorizedAccessError } from 'src/common/errors/unauthorized-access.error';
import { CreateSkillCommand } from 'src/domain/skills/application/use-cases/create-skill/create-skill.command';
import { CreateSkillUseCase } from 'src/domain/skills/application/use-cases/create-skill/create-skill.use-case';

import { WorkspacesRepository } from 'src/domain/workspaces/application/ports/workspaces-repository.port';
import {
  UnexpectedWorkspaceError,
  WorkspaceNotFoundError,
} from 'src/domain/workspaces/application/workspaces.errors';
import { CreateWorkspaceSkillCommand } from './create-workspace-skill.command';

@Injectable()
export class CreateWorkspaceSkillUseCase {
  private readonly logger = new Logger(CreateWorkspaceSkillUseCase.name);

  constructor(
    private readonly workspacesRepository: WorkspacesRepository,
    private readonly createSkillUseCase: CreateSkillUseCase,
    private readonly contextService: ContextService,
  ) {}

  @HandleUnexpectedErrors(UnexpectedWorkspaceError)
  async execute(
    command: CreateWorkspaceSkillCommand,
  ): Promise<WorkspaceSkillContext> {
    const userId = this.contextService.get('userId');
    if (!userId) throw new UnauthorizedAccessError();
    const workspace = await this.workspacesRepository.findById(
      userId,
      command.workspaceId,
    );
    if (!workspace) throw new WorkspaceNotFoundError(command.workspaceId);

    this.logger.log(
      { workspaceId: command.workspaceId },
      'createWorkspaceSkill',
    );
    const skill = await this.createSkillUseCase.execute(
      new CreateSkillCommand({
        name: command.name,
        shortDescription: command.shortDescription,
        instructions: command.instructions,
        workspaceId: command.workspaceId,
      }),
    );
    if (!(skill instanceof WorkspaceSkill))
      throw new Error('Workspace creation returned a personal skill');
    return { skill, isActive: true, isPinned: false };
  }
}
