import { Injectable, Logger } from '@nestjs/common';
import type { UUID } from 'crypto';
import { ContextService } from 'src/common/context/services/context.service';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { UnauthorizedAccessError } from 'src/common/errors/unauthorized-access.error';
import type { SkillContext } from 'src/domain/skills/application/models/skill-context';
import { SkillRepository } from 'src/domain/skills/application/ports/skill.repository';
import { SkillAuthorizationService } from 'src/domain/skills/application/services/skill-authorization.service';
import { SkillCreatorNameService } from 'src/domain/skills/application/services/skill-creator-name.service';
import {
  SkillNotFoundError,
  UnexpectedSkillError,
} from 'src/domain/skills/application/skills.errors';
import { PersonalSkill } from 'src/domain/skills/domain/personal-skill.entity';
import type { Skill } from 'src/domain/skills/domain/skill';
import { FindOneSkillQuery } from './find-one-skill.query';

@Injectable()
export class FindOneSkillUseCase {
  private readonly logger = new Logger(FindOneSkillUseCase.name);

  constructor(
    private readonly repository: SkillRepository,
    private readonly authorization: SkillAuthorizationService,
    private readonly creatorNames: SkillCreatorNameService,
    private readonly context: ContextService,
  ) {}

  @HandleUnexpectedErrors(UnexpectedSkillError)
  async execute(query: FindOneSkillQuery): Promise<SkillContext> {
    this.logger.log({ id: query.id }, 'Finding skill');
    const skill = await this.repository.findById(query.id);
    if (!skill) throw new SkillNotFoundError(query.id);
    await this.authorization.requireRead(skill);
    return this.resolveContext(skill);
  }

  private async resolveContext(skill: Skill): Promise<SkillContext> {
    if (!(skill instanceof PersonalSkill)) {
      const states = await this.repository.getWorkspaceSkillStates(
        [skill.id],
        skill.workspaceId,
      );
      const state = states.get(skill.id) ?? {
        isActive: false,
        isPinned: false,
      };
      return { skill, ...state, isShared: false, creatorName: null };
    }
    return this.resolvePersonalContext(skill);
  }

  private async resolvePersonalContext(
    skill: PersonalSkill,
  ): Promise<SkillContext<PersonalSkill>> {
    const userId = this.requireUserId();
    const isShared = skill.userId !== userId;
    const [isActive, isPinned, creatorName] = await Promise.all([
      this.repository.isSkillActive(skill.id, userId),
      this.repository.isSkillPinned(skill.id, userId),
      isShared ? this.creatorNames.resolveOne(skill.userId) : null,
    ]);
    return { skill, isActive, isPinned, isShared, creatorName };
  }

  private requireUserId(): UUID {
    const userId = this.context.get('userId');
    if (!userId) throw new UnauthorizedAccessError();
    return userId;
  }
}
