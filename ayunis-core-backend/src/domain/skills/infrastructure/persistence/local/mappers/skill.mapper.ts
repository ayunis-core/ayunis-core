import { Injectable } from '@nestjs/common';
import type { UUID } from 'crypto';
import type { Skill } from 'src/domain/skills/domain/skill';
import { AbstractCollectiveSkill } from 'src/domain/skills/domain/collective-skill.entity';
import { OrgSkill } from 'src/domain/skills/domain/org-skill.entity';
import { PersonalSkill } from 'src/domain/skills/domain/personal-skill.entity';
import { TeamSkill } from 'src/domain/skills/domain/team-skill.entity';
import { WorkspaceSkill } from 'src/domain/skills/domain/workspace-skill.entity';
import { SkillRecord } from 'src/domain/skills/infrastructure/persistence/local/schema/skill.record';

type SkillOwnerColumn = 'userId' | 'workspaceId' | 'teamId' | 'orgId';

const OWNER_COLUMNS: SkillOwnerColumn[] = [
  'userId',
  'workspaceId',
  'teamId',
  'orgId',
];

@Injectable()
export class SkillMapper {
  toDomain(record: SkillRecord): Skill {
    const params = this.toParams(record);
    // Records loaded before a column existed may omit it entirely.
    const owners = OWNER_COLUMNS.flatMap((column) => {
      const id = record[column] as UUID | null | undefined;
      return id ? [{ column, id }] : [];
    });
    if (owners.length !== 1) {
      throw new Error(`Skill ${record.id} has invalid ownership`);
    }
    const [{ column: owner, id: ownerId }] = owners;
    const state = { isActive: record.isActive, isPinned: record.isPinned };
    switch (owner) {
      case 'userId':
        return new PersonalSkill({ ...params, userId: ownerId });
      case 'workspaceId':
        return new WorkspaceSkill({ ...params, workspaceId: ownerId });
      case 'teamId':
        return new TeamSkill({ ...params, ...state, teamId: ownerId });
      case 'orgId':
        return new OrgSkill({ ...params, ...state, orgId: ownerId });
    }
  }

  private toParams(record: SkillRecord) {
    return {
      id: record.id,
      name: record.name,
      shortDescription: record.shortDescription,
      instructions: record.instructions,
      sourceIds: record.sources?.map((source) => source.id) ?? [],
      mcpIntegrationIds:
        record.mcpIntegrations?.map((integration) => integration.id) ?? [],
      knowledgeBaseIds: record.knowledgeBases?.map((kb) => kb.id) ?? [],
      marketplaceIdentifier: record.marketplaceIdentifier ?? null,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    };
  }

  toPersonal(record: SkillRecord): PersonalSkill {
    const skill = this.toDomain(record);
    if (!(skill instanceof PersonalSkill))
      throw new Error(`Expected personal skill ${record.id}`);
    return skill;
  }

  toWorkspace(record: SkillRecord): WorkspaceSkill {
    const skill = this.toDomain(record);
    if (!(skill instanceof WorkspaceSkill))
      throw new Error(`Expected workspace skill ${record.id}`);
    return skill;
  }

  toRecord(domain: Skill): SkillRecord {
    const record = new SkillRecord();
    record.id = domain.id;
    record.name = domain.name;
    record.shortDescription = domain.shortDescription;
    record.instructions = domain.instructions;
    record.marketplaceIdentifier = domain.marketplaceIdentifier;
    record.userId = domain instanceof PersonalSkill ? domain.userId : null;
    record.workspaceId =
      domain instanceof WorkspaceSkill ? domain.workspaceId : null;
    record.teamId = domain instanceof TeamSkill ? domain.teamId : null;
    record.orgId = domain instanceof OrgSkill ? domain.orgId : null;
    const collective = domain instanceof AbstractCollectiveSkill;
    record.isActive = collective && domain.isActive;
    record.isPinned = collective && domain.isPinned;
    return record;
  }
}
