import { Injectable, Logger } from '@nestjs/common';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { ContextService } from 'src/common/context/services/context.service';
import { UnauthorizedAccessError } from 'src/common/errors/unauthorized-access.error';
import { SkillRepository } from 'src/domain/skills/application/ports/skill.repository';
import {
  DuplicateSkillNameError,
  UnexpectedSkillError,
} from 'src/domain/skills/application/skills.errors';
import { Skill } from 'src/domain/skills/domain/skill.entity';
import { CreateSkillCommand } from './create-skill.command';

@Injectable()
export class CreateSkillUseCase {
  private readonly logger = new Logger(CreateSkillUseCase.name);

  constructor(
    private readonly skillRepository: SkillRepository,
    private readonly contextService: ContextService,
  ) {}

  @HandleUnexpectedErrors(UnexpectedSkillError)
  async execute(command: CreateSkillCommand): Promise<Skill> {
    this.logger.log(
      { name: command.name, workspaceId: command.workspaceId },
      'createSkill',
    );
    const userId = this.contextService.get('userId');
    if (!userId) throw new UnauthorizedAccessError();

    const existing = command.workspaceId
      ? await this.skillRepository.findByNameAndWorkspace(
          command.name,
          command.workspaceId,
        )
      : await this.skillRepository.findByNameAndOwner(command.name, userId);
    if (existing) throw new DuplicateSkillNameError(command.name);

    const created = await this.skillRepository.create(
      new Skill({
        name: command.name,
        shortDescription: command.shortDescription,
        instructions: command.instructions,
        userId: command.workspaceId ? null : userId,
        workspaceId: command.workspaceId,
        mcpIntegrationIds: command.mcpIntegrationIds,
      }),
    );

    if (command.isActive && !command.workspaceId) {
      await this.skillRepository.activateSkill(created.id, userId);
    }
    return created;
  }
}
