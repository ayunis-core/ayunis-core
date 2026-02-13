import { Injectable } from '@nestjs/common';
import { UserSystemPromptRecord } from '../schema/user-system-prompt.record';
import { UserSystemPrompt } from '../../../../domain/user-system-prompt.entity';

@Injectable()
export class UserSystemPromptMapper {
  toDomain(record: UserSystemPromptRecord): UserSystemPrompt {
    return new UserSystemPrompt({
      id: record.id,
      userId: record.userId,
      systemPrompt: record.systemPrompt,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    });
  }

  toRecord(domain: UserSystemPrompt): UserSystemPromptRecord {
    const record = new UserSystemPromptRecord();
    record.id = domain.id;
    record.userId = domain.userId;
    record.systemPrompt = domain.systemPrompt;
    record.createdAt = domain.createdAt;
    record.updatedAt = domain.updatedAt;
    return record;
  }
}
