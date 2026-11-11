import { Injectable } from '@nestjs/common';
import { CollectiveResourceAccessService } from 'src/domain/ownership/application/services/collective-resource-access.service';
import { SkillNotFoundError } from 'src/domain/skills/application/skills.errors';
import type { CollectiveSkill } from 'src/domain/skills/domain/skill';
import { TeamSkill } from 'src/domain/skills/domain/team-skill.entity';
import { Permission } from 'src/iam/permissions/domain/value-objects/permission.enum';
import type { CollectiveOwner } from 'src/iam/teams/application/models/collective-owner.model';
import { GetCollectiveOwnerAccessUseCase } from 'src/iam/teams/application/use-cases/get-collective-owner-access/get-collective-owner-access.use-case';
import { ListReadableCollectiveOwnersUseCase } from 'src/iam/teams/application/use-cases/list-readable-collective-owners/list-readable-collective-owners.use-case';

@Injectable()
export class CollectiveSkillAccessService extends CollectiveResourceAccessService<CollectiveSkill> {
  constructor(
    getOwnerAccess: GetCollectiveOwnerAccessUseCase,
    listReadableOwners: ListReadableCollectiveOwnersUseCase,
  ) {
    super(getOwnerAccess, listReadableOwners, {
      permissions: {
        manage: Permission.MANAGE_SKILLS,
        team: Permission.SHARE_SKILLS_WITH_TEAMS,
        org: Permission.SHARE_SKILLS_WITH_ORG,
      },
      notFound: (id) => new SkillNotFoundError(id),
    });
  }

  protected ownerOf(skill: CollectiveSkill): CollectiveOwner {
    return skill instanceof TeamSkill
      ? { type: 'team', teamId: skill.teamId }
      : { type: 'org', orgId: skill.orgId };
  }
}
