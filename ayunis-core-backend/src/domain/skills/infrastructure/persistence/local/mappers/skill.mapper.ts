import { Injectable } from '@nestjs/common';
import type { Skill } from 'src/domain/skills/domain/skill';
import { PersonalSkill } from 'src/domain/skills/domain/personal-skill.entity';
import { WorkspaceSkill } from 'src/domain/skills/domain/workspace-skill.entity';
import { TeamSkill } from 'src/domain/skills/domain/team-skill.entity';
import { OrgSkill } from 'src/domain/skills/domain/org-skill.entity';
import { SkillRecord } from 'src/domain/skills/infrastructure/persistence/local/schema/skill.record';

@Injectable()
export class SkillMapper {
  toDomain(record: SkillRecord): Skill {
    const params = this.toParams(record);
    const { userId, workspaceId, teamId, orgId } = record;
    if (userId !== null && workspaceId === null) {
      return new PersonalSkill({ ...params, userId });
    }
    if (workspaceId !== null && userId === null) {
      return new WorkspaceSkill({ ...params, workspaceId });
    }
    if (teamId && orgId) {
      return new TeamSkill({ ...params, teamId, orgId });
    }
    if (orgId) {
      return new OrgSkill({ ...params, orgId });
    }
    throw new Error(`Skill ${record.id} has invalid ownership`);
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
    record.orgId =
      domain instanceof TeamSkill || domain instanceof OrgSkill
        ? domain.orgId
        : null;
    return record;
  }
}
