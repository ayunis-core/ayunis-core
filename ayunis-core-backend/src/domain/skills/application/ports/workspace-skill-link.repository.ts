import type { UUID } from 'crypto';

export interface WorkspaceSkillLink {
  workspaceId: UUID;
  skillId: UUID;
  linkedByUserId: UUID | null;
  linkedAt: Date;
}

export interface PersonalSkillLink {
  workspaceId: UUID;
  skillId: UUID;
  ownerId: UUID;
}

export interface PersonalLinkFilter {
  workspaceIds?: UUID[];
  ownerIds?: UUID[];
}

export abstract class WorkspaceSkillLinkRepository {
  abstract findByWorkspace(workspaceId: UUID): Promise<WorkspaceSkillLink[]>;
  abstract findBySkill(skillId: UUID): Promise<WorkspaceSkillLink[]>;
  abstract isLinked(workspaceId: UUID, skillId: UUID): Promise<boolean>;
  abstract link(
    workspaceId: UUID,
    skillIds: UUID[],
    linkedByUserId: UUID,
  ): Promise<void>;
  abstract unlink(workspaceId: UUID, skillId: UUID): Promise<void>;
  abstract findPersonalLinks(
    filter: PersonalLinkFilter,
  ): Promise<PersonalSkillLink[]>;
  abstract removeMany(
    links: Pick<PersonalSkillLink, 'workspaceId' | 'skillId'>[],
  ): Promise<number>;
}
