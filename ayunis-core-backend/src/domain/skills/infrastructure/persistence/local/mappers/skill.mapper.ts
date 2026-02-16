import { Injectable } from '@nestjs/common';
import { Skill } from '../../../../domain/skill.entity';
import { SkillRecord } from '../schema/skill.record';

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
      userId: record.userId,
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
    record.userId = domain.userId;
    return record;
  }
}
