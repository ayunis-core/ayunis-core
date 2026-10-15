import { Injectable, Logger } from '@nestjs/common';
import type { UUID } from 'crypto';
import { Transactional } from '@nestjs-cls/transactional';
import { ContextService } from 'src/common/context/services/context.service';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { UnauthorizedAccessError } from 'src/common/errors/unauthorized-access.error';
import { GetOwnershipViewerUseCase } from 'src/domain/ownership/application/use-cases/get-ownership-viewer/get-ownership-viewer.use-case';
import {
  collectiveOwnerOf,
  isCollectiveSkill,
} from 'src/domain/skills/application/models/collective-skill-owner';
import { CollectiveSkillRepository } from 'src/domain/skills/application/ports/collective-skill.repository';
import { SkillRepository } from 'src/domain/skills/application/ports/skill.repository';
import { SkillAuthorizationService } from 'src/domain/skills/application/services/skill-authorization.service';
import { SkillNameLookupService } from 'src/domain/skills/application/services/skill-name-lookup.service';
import {
  DuplicateSkillNameError,
  SkillInvalidInputError,
  UnexpectedSkillError,
} from 'src/domain/skills/application/skills.errors';
import { InvalidSkillNameError } from 'src/domain/skills/domain/abstract-skill.entity';
import { OrgSkill } from 'src/domain/skills/domain/org-skill.entity';
import { PersonalSkill } from 'src/domain/skills/domain/personal-skill.entity';
import type { Skill } from 'src/domain/skills/domain/skill';
import { TeamSkill } from 'src/domain/skills/domain/team-skill.entity';
import { WorkspaceSkill } from 'src/domain/skills/domain/workspace-skill.entity';
import { CreateSkillCommand } from './create-skill.command';
import { getRequiredUserContext } from 'src/common/context/required-context';

@Injectable()
export class CreateSkillUseCase {
  private readonly logger = new Logger(CreateSkillUseCase.name);

  constructor(
    private readonly repository: SkillRepository,
    private readonly collectiveRepository: CollectiveSkillRepository,
    private readonly authorization: SkillAuthorizationService,
    private readonly names: SkillNameLookupService,
    private readonly getViewer: GetOwnershipViewerUseCase,
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
    const skill = this.createEntity(command, userId, orgId);
    await this.authorizeCreate(skill);
    this.assertNoCollectiveIntegrations(skill);
    const existing = await this.names.findSameOwnerByName(skill, skill.name);
    if (existing) throw new DuplicateSkillNameError(skill.name);
    const created = await this.repository.create(skill);
    await this.applyActivation(created, command.isActive ?? true, userId);
    return created;
  }

  private createEntity(
    command: CreateSkillCommand,
    userId: UUID,
    orgId: UUID,
  ): Skill {
    const params = {
      name: command.name,
      shortDescription: command.shortDescription,
      instructions: command.instructions,
      mcpIntegrationIds: command.mcpIntegrationIds,
    };
    const { owner } = command;
    try {
      switch (owner.type) {
        case 'workspace':
          return new WorkspaceSkill({
            ...params,
            workspaceId: owner.workspaceId,
          });
        case 'team':
          return new TeamSkill({ ...params, teamId: owner.teamId, orgId });
        case 'org':
          return new OrgSkill({ ...params, orgId });
        case 'personal':
          return new PersonalSkill({ ...params, userId });
      }
    } catch (error) {
      if (error instanceof InvalidSkillNameError) {
        throw new SkillInvalidInputError(error.message);
      }
      throw error;
    }
  }

  private async authorizeCreate(skill: Skill): Promise<void> {
    if (!isCollectiveSkill(skill)) {
      await this.authorization.requireManage(skill);
      return;
    }
    const viewer = await this.getViewer.execute();
    if (!viewer.mayCreateFor('skill', collectiveOwnerOf(skill))) {
      throw new UnauthorizedAccessError();
    }
  }

  private assertNoCollectiveIntegrations(skill: Skill): void {
    if (isCollectiveSkill(skill) && skill.mcpIntegrationIds.length > 0) {
      throw new SkillInvalidInputError(
        'Team and organisation skills cannot link MCP integrations',
      );
    }
  }

  private async applyActivation(
    skill: Skill,
    requestedActive: boolean,
    userId: UUID,
  ): Promise<void> {
    if (isCollectiveSkill(skill)) {
      if (!requestedActive) {
        await this.collectiveRepository.setActive(skill.id, userId, false);
      }
      return;
    }
    if (!requestedActive) return;
    if (skill instanceof WorkspaceSkill) {
      await this.repository.activateWorkspaceSkill(skill.id, skill.workspaceId);
    } else {
      await this.repository.activateSkill(skill.id, userId);
    }
  }
}
