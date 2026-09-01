import { Injectable } from '@nestjs/common';
import { Skill } from 'src/domain/skills/domain/skill.entity';
import { SkillRecord } from 'src/domain/skills/infrastructure/persistence/local/schema/skill.record';

@Injectable()
export class SkillMapper {
  toDomain(record: SkillRecord): Skill {
    return new Skill({
      id: record.id,
      name: record.name,
      shortDescription: record.shortDescription,
      instructions: record.instructions,
      sourceIds: record.sources?.map((source) => source.id) ?? [],
      mcpIntegrationIds:
        record.mcpIntegrations?.map((integration) => integration.id) ?? [],
      knowledgeBaseIds: record.knowledgeBases?.map((kb) => kb.id) ?? [],
      marketplaceIdentifier: record.marketplaceIdentifier ?? null,
      userId: record.userId,
      workspaceId: record.workspaceId,
      originSkillId: record.originSkillId,
      version: record.version,
      importedOriginVersion: record.importedOriginVersion,
      dismissedOriginVersion: record.dismissedOriginVersion,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    });
  }

  toRecord(domain: Skill): SkillRecord {
    const record = new SkillRecord();
    record.id = domain.id;
    record.name = domain.name;
    record.shortDescription = domain.shortDescription;
    record.instructions = domain.instructions;
    record.marketplaceIdentifier = domain.marketplaceIdentifier;
    record.userId = domain.userId;
    record.workspaceId = domain.workspaceId;
    record.originSkillId = domain.originSkillId;
    record.version = domain.version;
    record.importedOriginVersion = domain.importedOriginVersion;
    record.dismissedOriginVersion = domain.dismissedOriginVersion;
    return record;
  }
}
