import type { UUID } from 'crypto';
import type { OrgSkill } from 'src/domain/skills/domain/org-skill.entity';
import type { CollectiveSkill } from 'src/domain/skills/domain/skill';
import type { TeamSkill } from 'src/domain/skills/domain/team-skill.entity';

export interface CollectiveSkillScope {
  userId: UUID;
  orgId: UUID;
  teamIds: UUID[];
}

export interface CollectiveSkillState {
  isActive: boolean;
  isPinned: boolean;
}

export abstract class CollectiveSkillRepository {
  abstract findByNameAndTeam(
    name: string,
    teamId: UUID,
  ): Promise<TeamSkill | null>;
  abstract findByNameAndOrg(
    name: string,
    orgId: UUID,
  ): Promise<OrgSkill | null>;
  abstract findUsable(scope: CollectiveSkillScope): Promise<CollectiveSkill[]>;
  abstract findActiveUsable(
    scope: CollectiveSkillScope,
    options: { includeMandatory: boolean },
  ): Promise<CollectiveSkill[]>;
  abstract setMandatory(skillId: UUID, isMandatory: boolean): Promise<void>;
  abstract getStates(
    skillIds: UUID[],
    userId: UUID,
  ): Promise<Map<UUID, CollectiveSkillState>>;
  abstract setActive(
    skillId: UUID,
    userId: UUID,
    isActive: boolean,
  ): Promise<void>;
  abstract transferFromPersonal(
    skillId: UUID,
    owner: { teamId: UUID | null; orgId: UUID; submittedByUserId: UUID },
  ): Promise<boolean>;
  abstract setPinned(
    skillId: UUID,
    userId: UUID,
    isPinned: boolean,
  ): Promise<void>;
}
