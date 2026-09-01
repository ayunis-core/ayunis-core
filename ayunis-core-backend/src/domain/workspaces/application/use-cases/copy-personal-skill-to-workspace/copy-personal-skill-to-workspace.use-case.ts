import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { ContextService } from 'src/common/context/services/context.service';
import { UnauthorizedAccessError } from 'src/common/errors/unauthorized-access.error';
import { SkillAccessService } from 'src/domain/skills/application/services/skill-access.service';
import { SkillNotFoundError } from 'src/domain/skills/application/skills.errors';
import { CreateSkillCommand } from 'src/domain/skills/application/use-cases/create-skill/create-skill.command';
import { CreateSkillUseCase } from 'src/domain/skills/application/use-cases/create-skill/create-skill.use-case';
import type { Skill } from 'src/domain/skills/domain/skill.entity';
import { WorkspacesRepository } from 'src/domain/workspaces/application/ports/workspaces-repository.port';
import {
  UnexpectedWorkspaceError,
  WorkspaceNotFoundError,
} from 'src/domain/workspaces/application/workspaces.errors';
import { CopyPersonalSkillToWorkspaceCommand } from './copy-personal-skill-to-workspace.command';

@Injectable()
export class CopyPersonalSkillToWorkspaceUseCase {
  constructor(
    @InjectPinoLogger(CopyPersonalSkillToWorkspaceUseCase.name)
    private readonly logger: PinoLogger,
    private readonly workspacesRepository: WorkspacesRepository,
    private readonly skillAccessService: SkillAccessService,
    private readonly createSkillUseCase: CreateSkillUseCase,
    private readonly contextService: ContextService,
  ) {}

  @HandleUnexpectedErrors(UnexpectedWorkspaceError)
  async execute(command: CopyPersonalSkillToWorkspaceCommand): Promise<Skill> {
    const userId = this.contextService.get('userId');
    if (!userId) throw new UnauthorizedAccessError();
    const workspace = await this.workspacesRepository.findById(
      userId,
      command.workspaceId,
    );
    if (!workspace) throw new WorkspaceNotFoundError(command.workspaceId);

    const origin = await this.skillAccessService.findAccessibleSkill(
      command.skillId,
    );
    if (origin.userId !== userId || origin.workspaceId !== null) {
      throw new SkillNotFoundError(command.skillId);
    }

    this.logger.info(
      { workspaceId: command.workspaceId, sourceSkillId: origin.id },
      'copyPersonalSkillToWorkspace',
    );
    return this.createSkillUseCase.execute(
      new CreateSkillCommand({
        name: origin.name,
        shortDescription: origin.shortDescription,
        instructions: origin.instructions,
        workspaceId: command.workspaceId,
        mcpIntegrationIds: origin.mcpIntegrationIds,
      }),
    );
  }
}
