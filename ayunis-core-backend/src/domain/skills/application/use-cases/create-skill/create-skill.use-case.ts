import { InvalidSkillNameError } from 'src/domain/skills/domain/abstract-skill.entity';
import type { Skill } from 'src/domain/skills/domain/skill';
import { WorkspaceSkill } from 'src/domain/skills/domain/workspace-skill.entity';
import { PersonalSkill } from 'src/domain/skills/domain/personal-skill.entity';
import { Injectable, Logger } from '@nestjs/common';
import { Transactional } from '@nestjs-cls/transactional';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { ContextService } from 'src/common/context/services/context.service';
import { UnauthorizedAccessError } from 'src/common/errors/unauthorized-access.error';
import { SkillRepository } from 'src/domain/skills/application/ports/skill.repository';
import {
  DuplicateSkillNameError,
  SkillInvalidInputError,
  UnexpectedSkillError,
} from 'src/domain/skills/application/skills.errors';

import { CreateSkillCommand } from './create-skill.command';

@Injectable()
export class CreateSkillUseCase {
  private readonly logger = new Logger(CreateSkillUseCase.name);

  constructor(
    private readonly skillRepository: SkillRepository,
    private readonly contextService: ContextService,
  ) {}

  @HandleUnexpectedErrors(UnexpectedSkillError)
  @Transactional()
  async execute(command: CreateSkillCommand): Promise<Skill> {
    this.logger.log(
      { name: command.name, workspaceId: command.workspaceId },
      'createSkill',
    );
    const userId = this.contextService.get('userId');
    if (!userId) throw new UnauthorizedAccessError();

    let skill: Skill;
    try {
      const params = {
        name: command.name,
        shortDescription: command.shortDescription,
        instructions: command.instructions,
        mcpIntegrationIds: command.mcpIntegrationIds,
      };
      skill = command.workspaceId
        ? new WorkspaceSkill({ ...params, workspaceId: command.workspaceId })
        : new PersonalSkill({ ...params, userId });
    } catch (error) {
      if (error instanceof InvalidSkillNameError) {
        throw new SkillInvalidInputError(error.message);
      }
      throw error;
    }

    const existing = command.workspaceId
      ? await this.skillRepository.findByNameAndWorkspace(
          command.name,
          command.workspaceId,
        )
      : await this.skillRepository.findByNameAndOwner(command.name, userId);
    if (existing) throw new DuplicateSkillNameError(command.name);

    const created = await this.skillRepository.create(skill);

    if (command.workspaceId) {
      await this.skillRepository.activateWorkspaceSkill(
        created.id,
        command.workspaceId,
      );
    } else if (command.isActive) {
      await this.skillRepository.activateSkill(created.id, userId);
    }
    return created;
  }
}
