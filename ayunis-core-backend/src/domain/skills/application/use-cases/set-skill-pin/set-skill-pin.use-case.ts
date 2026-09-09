import { Injectable, Logger } from '@nestjs/common';
import { Transactional } from '@nestjs-cls/transactional';
import type { UUID } from 'crypto';
import { ContextService } from 'src/common/context/services/context.service';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { UnauthorizedAccessError } from 'src/common/errors/unauthorized-access.error';
import { SkillRepository } from 'src/domain/skills/application/ports/skill.repository';
import { SkillAuthorizationService } from 'src/domain/skills/application/services/skill-authorization.service';
import {
  SkillNotActiveError,
  SkillNotFoundError,
  UnexpectedSkillError,
} from 'src/domain/skills/application/skills.errors';
import { PersonalSkill } from 'src/domain/skills/domain/personal-skill.entity';
import type { Skill } from 'src/domain/skills/domain/skill';
import type { WorkspaceSkill } from 'src/domain/skills/domain/workspace-skill.entity';
import { HasPermissionQuery } from 'src/iam/permissions/application/use-cases/has-permission/has-permission.query';
import { HasPermissionUseCase } from 'src/iam/permissions/application/use-cases/has-permission/has-permission.use-case';
import { Permission } from 'src/iam/permissions/domain/value-objects/permission.enum';

interface SetSkillPinCommand {
  skillId: UUID;
  isPinned: boolean;
}

@Injectable()
export class SetSkillPinUseCase {
  private readonly logger = new Logger(SetSkillPinUseCase.name);

  constructor(
    private readonly repository: SkillRepository,
    private readonly authorization: SkillAuthorizationService,
    private readonly context: ContextService,
    private readonly hasPermission: HasPermissionUseCase,
  ) {}

  @HandleUnexpectedErrors(UnexpectedSkillError)
  @Transactional()
  async execute(command: SetSkillPinCommand): Promise<Skill> {
    this.logger.log(command, 'Setting skill pin');
    const skill = await this.repository.findById(command.skillId);
    if (!skill) throw new SkillNotFoundError(command.skillId);
    if (skill instanceof PersonalSkill) {
      await this.setPersonal(skill, command.isPinned);
    } else {
      await this.setWorkspace(skill, command.isPinned);
    }
    return skill;
  }

  private async setPersonal(
    skill: PersonalSkill,
    isPinned: boolean,
  ): Promise<void> {
    await this.authorization.requireRead(skill);
    const userId = this.requireUserId();
    if (isPinned && !(await this.repository.isSkillActive(skill.id, userId))) {
      throw new SkillNotActiveError(skill.id);
    }
    await this.repository.setSkillPinned(skill.id, userId, isPinned);
  }

  private async setWorkspace(
    skill: WorkspaceSkill,
    isPinned: boolean,
  ): Promise<void> {
    await this.authorization.requireWrite(skill);
    await this.requireManagementPermission();
    const states = await this.repository.getWorkspaceSkillStates(
      [skill.id],
      skill.workspaceId,
    );
    if (isPinned && !states.get(skill.id)?.isActive) {
      throw new SkillNotActiveError(skill.id);
    }
    await this.repository.setWorkspaceSkillPinned(
      skill.id,
      skill.workspaceId,
      isPinned,
    );
  }

  private async requireManagementPermission(): Promise<void> {
    const orgId = this.context.get('orgId');
    const role = this.context.get('role');
    if (!orgId || !role) throw new UnauthorizedAccessError();
    const allowed = await this.hasPermission.execute(
      new HasPermissionQuery(orgId, role, Permission.MANAGE_SKILLS),
    );
    if (!allowed) throw new UnauthorizedAccessError();
  }

  private requireUserId(): UUID {
    const userId = this.context.get('userId');
    if (!userId) throw new UnauthorizedAccessError();
    return userId;
  }
}
