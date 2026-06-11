import { Injectable } from '@nestjs/common';
import { OrgSystemPromptRecord } from '../schema/org-system-prompt.record';
import { OrgSystemPrompt } from '../../../../domain/org-system-prompt.entity';

@Injectable()
export class OrgSystemPromptMapper {
  toDomain(record: OrgSystemPromptRecord): OrgSystemPrompt {
    return new OrgSystemPrompt({
      id: record.id,
      orgId: record.orgId,
      systemPrompt: record.systemPrompt,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    });
  }

  toRecord(domain: OrgSystemPrompt): OrgSystemPromptRecord {
    const record = new OrgSystemPromptRecord();
    record.id = domain.id;
    record.orgId = domain.orgId;
    record.systemPrompt = domain.systemPrompt;
    record.createdAt = domain.createdAt;
    record.updatedAt = domain.updatedAt;
    return record;
  }
}
