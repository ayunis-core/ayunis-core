import { Injectable } from '@nestjs/common';
import { Usage } from '../../../../domain/usage.entity';
import { UsageRecord } from '../schema/usage.record';
import { ModelProvider } from '../../../../../models/domain/value-objects/model-provider.enum';

@Injectable()
export class UsageMapper {
  toRecord(usage: Usage): UsageRecord {
    const record = new UsageRecord();
    record.id = usage.id;
    record.userId = usage.userId;
    record.organizationId = usage.organizationId;
    record.modelId = usage.modelId;
    record.provider = usage.provider;
    record.inputTokens = usage.inputTokens;
    record.outputTokens = usage.outputTokens;
    record.totalTokens = usage.totalTokens;
    record.cost = usage.cost ?? null;
    record.currency = usage.currency ?? null;
    record.requestId = usage.requestId;
    record.createdAt = usage.createdAt;
    return record;
  }

  toDomain(record: UsageRecord): Usage {
    return new Usage({
      id: record.id,
      userId: record.userId,
      organizationId: record.organizationId,
      modelId: record.modelId,
      provider: record.provider as ModelProvider,
      inputTokens: record.inputTokens,
      outputTokens: record.outputTokens,
      totalTokens: record.totalTokens,
      cost: record.cost ?? undefined,
      currency: record.currency ?? undefined,
      requestId: record.requestId,
      createdAt: record.createdAt,
    });
  }

  toDomainArray(records: UsageRecord[]): Usage[] {
    return records.map((record) => this.toDomain(record));
  }
}
