import { Injectable, Logger } from '@nestjs/common';
import type { UUID } from 'crypto';
import { ContextService } from 'src/common/context/services/context.service';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import type { SkillContext } from 'src/domain/skills/application/models/skill-context';
import { SkillRepository } from 'src/domain/skills/application/ports/skill.repository';
import { SkillAuthorizationService } from 'src/domain/skills/application/services/skill-authorization.service';
import {
  SkillNotFoundError,
  UnexpectedSkillError,
} from 'src/domain/skills/application/skills.errors';
import type { PersonalSkill } from 'src/domain/skills/domain/personal-skill.entity';
import { WorkspaceSkill } from 'src/domain/skills/domain/workspace-skill.entity';
import { isCollectiveSkill } from 'src/domain/skills/application/models/collective-skill-owner';
import { SkillOwnershipContextService } from 'src/domain/skills/application/services/skill-ownership-context.service';
import type { Skill } from 'src/domain/skills/domain/skill';
import { FindOneSkillQuery } from './find-one-skill.query';
import { getRequiredUserContext } from 'src/common/context/required-context';

@Injectable()
export class FindOneSkillUseCase {
  private readonly logger = new Logger(FindOneSkillUseCase.name);

  constructor(
    private readonly repository: SkillRepository,
    private readonly authorization: SkillAuthorizationService,
    private readonly ownershipContext: SkillOwnershipContextService,
    private readonly context: ContextService,
  ) {}

  @HandleUnexpectedErrors(UnexpectedSkillError)
  async execute(query: FindOneSkillQuery): Promise<SkillContext> {
    this.logger.log({ id: query.id }, 'Finding skill');
    const skill = await this.repository.findById(query.id);
    if (!skill) throw new SkillNotFoundError(query.id);
    await this.authorization.requireView(skill);
    return this.resolveContext(skill);
  }

  private async resolveContext(skill: Skill): Promise<SkillContext> {
    if (skill instanceof WorkspaceSkill) {
      const states = await this.repository.getWorkspaceSkillStates(
        [skill.id],
        skill.workspaceId,
      );
      const state = states.get(skill.id) ?? {
        isActive: false,
        isPinned: false,
      };
      return { skill, ...state };
    }
    const ownership = await this.ownershipContext.lookup([skill]);
    const extras = {
      viewer: ownership.rightsFor(skill),
      ownerDescription: ownership.describe(skill),
    };
    if (isCollectiveSkill(skill)) {
      return {
        skill,
        ...ownership.stateOf(skill),
        ...extras,
      };
    }
    return { ...(await this.resolvePersonalContext(skill)), ...extras };
  }

  private async resolvePersonalContext(
    skill: PersonalSkill,
  ): Promise<SkillContext<PersonalSkill>> {
    const userId = this.requireUserId();
    const [isActive, isPinned] = await Promise.all([
      this.repository.isSkillActive(skill.id, userId),
      this.repository.isSkillPinned(skill.id, userId),
    ]);
    return { skill, isActive, isPinned };
  }

  private requireUserId(): UUID {
    const { userId } = getRequiredUserContext(this.context);
    return userId;
  }
}
