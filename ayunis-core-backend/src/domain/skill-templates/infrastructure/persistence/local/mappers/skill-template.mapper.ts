import { Injectable } from '@nestjs/common';
import { SkillTemplate } from '../../../../domain/skill-template.entity';
import { SkillTemplateRecord } from '../schema/skill-template.record';

@Injectable()
export class SkillTemplateMapper {
  toDomain(record: SkillTemplateRecord): SkillTemplate {
    return new SkillTemplate({
      id: record.id,
      name: record.name,
      shortDescription: record.shortDescription,
      instructions: record.instructions,
      distributionMode: record.distributionMode,
      isActive: record.isActive,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    });
  }

  toRecord(domain: SkillTemplate): SkillTemplateRecord {
    const record = new SkillTemplateRecord();
    record.id = domain.id;
    record.name = domain.name;
    record.shortDescription = domain.shortDescription;
    record.instructions = domain.instructions;
    record.distributionMode = domain.distributionMode;
    record.isActive = domain.isActive;
    return record;
  }
}
