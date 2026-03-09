import { Injectable } from '@nestjs/common';
import { SkillTemplate } from '../../../../domain/skill-template.entity';
import { AlwaysOnSkillTemplate } from '../../../../domain/always-on-skill-template.entity';
import { PreCreatedCopySkillTemplate } from '../../../../domain/pre-created-copy-skill-template.entity';
import { SkillTemplateRecord } from '../schema/skill-template.record';
import { AlwaysOnSkillTemplateRecord } from '../schema/always-on-skill-template.record';
import { PreCreatedCopySkillTemplateRecord } from '../schema/pre-created-copy-skill-template.record';

@Injectable()
export class SkillTemplateMapper {
  toDomain(record: SkillTemplateRecord): SkillTemplate {
    if (record instanceof PreCreatedCopySkillTemplateRecord) {
      return new PreCreatedCopySkillTemplate({
        ...this.sharedRecordFields(record),
        defaultActive: record.defaultActive ?? false,
        defaultPinned: record.defaultPinned ?? false,
      });
    }

    if (record instanceof AlwaysOnSkillTemplateRecord) {
      return new AlwaysOnSkillTemplate(this.sharedRecordFields(record));
    }

    throw new Error(
      'Unknown skill template record type: ' + record.constructor.name,
    );
  }

  toRecord(domain: SkillTemplate): SkillTemplateRecord {
    if (domain instanceof PreCreatedCopySkillTemplate) {
      const record = new PreCreatedCopySkillTemplateRecord();
      this.assignSharedRecordFields(record, domain);
      record.defaultActive = domain.defaultActive;
      record.defaultPinned = domain.defaultPinned;
      return record;
    }

    if (domain instanceof AlwaysOnSkillTemplate) {
      const record = new AlwaysOnSkillTemplateRecord();
      this.assignSharedRecordFields(record, domain);
      return record;
    }

    throw new Error('Unknown skill template type: ' + domain.constructor.name);
  }

  private sharedRecordFields(record: SkillTemplateRecord) {
    return {
      id: record.id,
      name: record.name,
      shortDescription: record.shortDescription,
      instructions: record.instructions,
      isActive: record.isActive,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    };
  }

  private assignSharedRecordFields(
    record: SkillTemplateRecord,
    domain: SkillTemplate,
  ): void {
    record.id = domain.id;
    record.name = domain.name;
    record.shortDescription = domain.shortDescription;
    record.instructions = domain.instructions;
    record.isActive = domain.isActive;
  }
}
