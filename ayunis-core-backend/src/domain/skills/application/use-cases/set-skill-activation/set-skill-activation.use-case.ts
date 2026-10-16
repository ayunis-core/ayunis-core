import { Injectable, Logger } from '@nestjs/common';
import { Transactional } from '@nestjs-cls/transactional';
import type { UUID } from 'crypto';
import { ContextService } from 'src/common/context/services/context.service';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { UnauthorizedAccessError } from 'src/common/errors/unauthorized-access.error';
import { SkillRepository } from 'src/domain/skills/application/ports/skill.repository';
import { CollectiveSkillRepository } from 'src/domain/skills/application/ports/collective-skill.repository';
import { isCollectiveSkill } from 'src/domain/skills/application/models/collective-skill-owner';
import { SkillAuthorizationService } from 'src/domain/skills/application/services/skill-authorization.service';
import {
  SkillIsMandatoryError,
  SkillNotFoundError,
  UnexpectedSkillError,
} from 'src/domain/skills/application/skills.errors';
import { OrgSkill } from 'src/domain/skills/domain/org-skill.entity';
import { PersonalSkill } from 'src/domain/skills/domain/personal-skill.entity';
import type { Skill } from 'src/domain/skills/domain/skill';
import type { WorkspaceSkill } from 'src/domain/skills/domain/workspace-skill.entity';
import { HasPermissionQuery } from 'src/iam/permissions/application/use-cases/has-permission/has-permission.query';
import { HasPermissionUseCase } from 'src/iam/permissions/application/use-cases/has-permission/has-permission.use-case';
import { Permission } from 'src/iam/permissions/domain/value-objects/permission.enum';
import { getRequiredUserContext } from 'src/common/context/required-context';

interface SetSkillActivationCommand {
  skillId: UUID;
  isActive: boolean;
}

@Injectable()
export class SetSkillActivationUseCase {
  private readonly logger = new Logger(SetSkillActivationUseCase.name);

  constructor(
    private readonly repository: SkillRepository,
    private readonly collectiveRepository: CollectiveSkillRepository,
    private readonly authorization: SkillAuthorizationService,
    private readonly context: ContextService,
    private readonly hasPermission: HasPermissionUseCase,
  ) {}

  @HandleUnexpectedErrors(UnexpectedSkillError)
  @Transactional()
  async execute(command: SetSkillActivationCommand): Promise<Skill> {
    this.logger.log(command, 'Setting skill activation');
    const skill = await this.repository.findById(command.skillId);
    if (!skill) throw new SkillNotFoundError(command.skillId);
    if (isCollectiveSkill(skill)) {
      await this.authorization.requireUse(skill);
      if (skill instanceof OrgSkill && skill.isMandatory) {
        if (!command.isActive) throw new SkillIsMandatoryError(skill.id);
        return skill;
      }
      await this.collectiveRepository.setActive(
        skill.id,
        this.requireUserId(),
        command.isActive,
      );
    } else if (skill instanceof PersonalSkill) {
      await this.setPersonal(skill, command.isActive);
    } else {
      await this.setWorkspace(skill, command.isActive);
    }
    return skill;
  }

  private async setPersonal(
    skill: PersonalSkill,
    isActive: boolean,
  ): Promise<void> {
    await this.authorization.requireRead(skill);
    const userId = this.requireUserId();
    if (isActive) await this.repository.activateSkill(skill.id, userId);
    else await this.repository.deactivateSkill(skill.id, userId);
  }

  private async setWorkspace(
    skill: WorkspaceSkill,
    isActive: boolean,
  ): Promise<void> {
    await this.authorization.requireWrite(skill);
    await this.requireManagementPermission();
    if (isActive) {
      await this.repository.activateWorkspaceSkill(skill.id, skill.workspaceId);
    } else {
      await this.repository.deactivateWorkspaceSkill(
        skill.id,
        skill.workspaceId,
      );
    }
  }

  private async requireManagementPermission(): Promise<void> {
    const { orgId, role } = getRequiredUserContext(this.context);
    const allowed = await this.hasPermission.execute(
      new HasPermissionQuery(orgId, role, Permission.MANAGE_OWN_SKILLS),
    );
    if (!allowed) throw new UnauthorizedAccessError();
  }

  private requireUserId(): UUID {
    const { userId } = getRequiredUserContext(this.context);
    return userId;
  }
}
