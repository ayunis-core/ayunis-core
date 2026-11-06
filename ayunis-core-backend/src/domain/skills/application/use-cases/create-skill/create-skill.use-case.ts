import { Injectable, Logger } from '@nestjs/common';
import type { UUID } from 'crypto';
import { Transactional } from '@nestjs-cls/transactional';
import { ContextService } from 'src/common/context/services/context.service';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { SkillRepository } from 'src/domain/skills/application/ports/skill.repository';
import { SkillAuthorizationService } from 'src/domain/skills/application/services/skill-authorization.service';
import {
  DuplicateSkillNameError,
  SkillInvalidInputError,
  UnexpectedSkillError,
} from 'src/domain/skills/application/skills.errors';
import {
  InvalidSkillNameError,
  type SkillParams,
} from 'src/domain/skills/domain/abstract-skill.entity';
import { OrgSkill } from 'src/domain/skills/domain/org-skill.entity';
import { PersonalSkill } from 'src/domain/skills/domain/personal-skill.entity';
import type { Skill } from 'src/domain/skills/domain/skill';
import { TeamSkill } from 'src/domain/skills/domain/team-skill.entity';
import { WorkspaceSkill } from 'src/domain/skills/domain/workspace-skill.entity';
import { findSkillByNameForOwner } from 'src/domain/skills/application/util/find-skill-by-name-for-owner';
import { CreateSkillCommand } from './create-skill.command';
import { getRequiredUserContext } from 'src/common/context/required-context';

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
    const { userId, orgId } = getRequiredUserContext(this.context);
    const isActive = command.isActive ?? true;
    const skill = this.createEntity(command, { userId, orgId, isActive });
    await this.authorization.requireCreate(skill);
    await this.assertUniqueName(skill);
    const created = await this.repository.create(skill);
    await this.activate(created, isActive, userId);
    return created;
  }

  private createEntity(
    command: CreateSkillCommand,
    principal: { userId: UUID; orgId: UUID; isActive: boolean },
  ): Skill {
    const params = {
      name: command.name,
      shortDescription: command.shortDescription,
      instructions: command.instructions,
      mcpIntegrationIds: command.mcpIntegrationIds,
    };
    try {
      return this.forOwner(command.owner, params, principal);
    } catch (error) {
      if (error instanceof InvalidSkillNameError) {
        throw new SkillInvalidInputError(error.message);
      }
      throw error;
    }
  }

  private forOwner(
    owner: CreateSkillCommand['owner'],
    params: SkillParams,
    principal: { userId: UUID; orgId: UUID; isActive: boolean },
  ): Skill {
    const { isActive } = principal;
    switch (owner.type) {
      case 'workspace':
        return new WorkspaceSkill({
          ...params,
          workspaceId: owner.workspaceId,
        });
      case 'team':
        return new TeamSkill({ ...params, teamId: owner.teamId, isActive });
      case 'org':
        return new OrgSkill({ ...params, orgId: principal.orgId, isActive });
      case 'personal':
        return new PersonalSkill({ ...params, userId: principal.userId });
    }
  }

  private async assertUniqueName(skill: Skill): Promise<void> {
    const existing = await findSkillByNameForOwner(
      this.repository,
      skill,
      skill.name,
    );
    if (existing) throw new DuplicateSkillNameError(skill.name);
  }

  private async activate(
    skill: Skill,
    requestedActive: boolean,
    userId: UUID,
  ): Promise<void> {
    if (!requestedActive) return;
    if (skill instanceof TeamSkill || skill instanceof OrgSkill) return;
    if (skill instanceof WorkspaceSkill) {
      await this.repository.activateWorkspaceSkill(skill.id, skill.workspaceId);
    } else {
      await this.repository.activateSkill(skill.id, userId);
    }
  }
}
