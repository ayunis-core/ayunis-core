import { Brackets } from 'typeorm';
import type { CollectiveSkillScope } from 'src/domain/skills/application/ports/collective-skill.repository';

export function usableCollectiveSkills(
  scope: Pick<CollectiveSkillScope, 'orgId' | 'teamIds'>,
): Brackets {
  return new Brackets((usable) => {
    usable.where('(skill.orgId = :scopeOrgId AND skill.teamId IS NULL)', {
      scopeOrgId: scope.orgId,
    });
    if (scope.teamIds.length > 0) {
      usable.orWhere('skill.teamId IN (:...scopeTeamIds)', {
        scopeTeamIds: scope.teamIds,
      });
    }
  });
}
