import { Injectable } from '@nestjs/common';
import { UnauthorizedAccessError } from 'src/common/errors/unauthorized-access.error';
import type { ReadableSkillOwners } from 'src/domain/skills/application/models/skill-owner';
import { SkillNotFoundError } from 'src/domain/skills/application/skills.errors';
import type { CollectiveSkill } from 'src/domain/skills/domain/skill';
import { TeamSkill } from 'src/domain/skills/domain/team-skill.entity';
import { Permission } from 'src/iam/permissions/domain/value-objects/permission.enum';
import type { CollectiveOwnerAccess } from 'src/iam/teams/application/models/collective-owner.model';
import { GetCollectiveOwnerAccessQuery } from 'src/iam/teams/application/use-cases/get-collective-owner-access/get-collective-owner-access.query';
import { GetCollectiveOwnerAccessUseCase } from 'src/iam/teams/application/use-cases/get-collective-owner-access/get-collective-owner-access.use-case';
import { ListReadableCollectiveOwnersUseCase } from 'src/iam/teams/application/use-cases/list-readable-collective-owners/list-readable-collective-owners.use-case';

const SKILL_OWNER_PERMISSIONS = {
  manage: Permission.MANAGE_SKILLS,
  team: Permission.SHARE_SKILLS_WITH_TEAMS,
  org: Permission.SHARE_SKILLS_WITH_ORG,
};

@Injectable()
export class CollectiveSkillAccessService {
  constructor(
    private readonly getOwnerAccess: GetCollectiveOwnerAccessUseCase,
    private readonly listReadableOwners: ListReadableCollectiveOwnersUseCase,
  ) {}

  async requireRead(skill: CollectiveSkill): Promise<void> {
    const access = await this.accessTo(skill, { manage: false });
    if (!access.canRead) throw new SkillNotFoundError(skill.id);
  }

  async requireWrite(skill: CollectiveSkill): Promise<void> {
    const access = await this.accessTo(skill);
    if (!access.canRead) throw new SkillNotFoundError(skill.id);
    if (!access.canManage) throw new UnauthorizedAccessError();
  }

  /** For skills that do not exist yet, where hiding them makes no sense. */
  async requireManage(skill: CollectiveSkill): Promise<void> {
    const access = await this.accessTo(skill);
    if (!access.canManage) throw new UnauthorizedAccessError();
  }

  readableOwners(): Promise<ReadableSkillOwners> {
    return this.listReadableOwners.execute();
  }

  private accessTo(
    skill: CollectiveSkill,
    { manage } = { manage: true },
  ): Promise<CollectiveOwnerAccess> {
    const owner =
      skill instanceof TeamSkill
        ? { type: 'team' as const, teamId: skill.teamId }
        : { type: 'org' as const, orgId: skill.orgId };
    return this.getOwnerAccess.execute(
      new GetCollectiveOwnerAccessQuery(
        owner,
        manage ? SKILL_OWNER_PERMISSIONS : undefined,
      ),
    );
  }
}
