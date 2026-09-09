import { Injectable, Logger } from '@nestjs/common';
import type { UUID } from 'crypto';
import { Transactional } from '@nestjs-cls/transactional';
import { ContextService } from 'src/common/context/services/context.service';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { UnauthorizedAccessError } from 'src/common/errors/unauthorized-access.error';
import { SkillRepository } from 'src/domain/skills/application/ports/skill.repository';
import { SkillAuthorizationService } from 'src/domain/skills/application/services/skill-authorization.service';
import {
  DuplicateSkillNameError,
  SkillInvalidInputError,
  UnexpectedSkillError,
} from 'src/domain/skills/application/skills.errors';
import { InvalidSkillNameError } from 'src/domain/skills/domain/abstract-skill.entity';
import { PersonalSkill } from 'src/domain/skills/domain/personal-skill.entity';
import type { Skill } from 'src/domain/skills/domain/skill';
import { WorkspaceSkill } from 'src/domain/skills/domain/workspace-skill.entity';
import { CreateSkillCommand } from './create-skill.command';

@Injectable()
export class CreateSkillUseCase {
  private readonly logger = new Logger(CreateSkillUseCase.name);

  constructor(
    private readonly repository: SkillRepository,
    private readonly authorization: SkillAuthorizationService,
    private readonly context: ContextService,
  ) {}

  @HandleUnexpectedErrors(UnexpectedSkillError)
  @Transactional()
  async execute(command: CreateSkillCommand): Promise<Skill> {
    this.logger.log(
      { name: command.name, ownerType: command.owner.type },
      'Creating skill',
    );
    const userId = this.context.get('userId');
    if (!userId) throw new UnauthorizedAccessError();
    const skill = this.createEntity(command, userId);
    await this.authorization.requireWrite(skill);
    await this.assertUniqueName(skill);
    const created = await this.repository.create(skill);
    await this.activate(created, command.isActive ?? true, userId);
    return created;
  }

  private createEntity(command: CreateSkillCommand, userId: UUID): Skill {
    const params = {
      name: command.name,
      shortDescription: command.shortDescription,
      instructions: command.instructions,
      mcpIntegrationIds: command.mcpIntegrationIds,
    };
    try {
      return command.owner.type === 'workspace'
        ? new WorkspaceSkill({
            ...params,
            workspaceId: command.owner.workspaceId,
          })
        : new PersonalSkill({ ...params, userId });
    } catch (error) {
      if (error instanceof InvalidSkillNameError) {
        throw new SkillInvalidInputError(error.message);
      }
      throw error;
    }
  }

  private async assertUniqueName(skill: Skill): Promise<void> {
    const existing =
      skill instanceof WorkspaceSkill
        ? await this.repository.findByNameAndWorkspace(
            skill.name,
            skill.workspaceId,
          )
        : await this.repository.findByNameAndOwner(skill.name, skill.userId);
    if (existing) throw new DuplicateSkillNameError(skill.name);
  }

  private async activate(
    skill: Skill,
    requestedActive: boolean,
    userId: UUID,
  ): Promise<void> {
    if (!requestedActive) return;
    if (skill instanceof WorkspaceSkill) {
      await this.repository.activateWorkspaceSkill(skill.id, skill.workspaceId);
    } else {
      await this.repository.activateSkill(skill.id, userId);
    }
  }
}
