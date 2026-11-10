import { Injectable } from '@nestjs/common';
import { Routine } from 'src/domain/routines/domain/routine.entity';
import { RoutineRecord } from 'src/domain/routines/infrastructure/persistence/local/schema/routine.record';

@Injectable()
export class RoutineMapper {
  toDomain(record: RoutineRecord): Routine {
    return new Routine({
      id: record.id,
      userId: record.userId,
      orgId: record.orgId,
      name: record.name,
      prompt: record.prompt,
      modelId: record.modelId,
      dailyTime: record.dailyTime,
      internetEnabled: record.internetEnabled,
      enabled: record.enabled,
      lastRunStatus: record.lastRunStatus,
      lastRunAt: record.lastRunAt,
      lastRunFailureReason: record.lastRunFailureReason,
      consecutiveFailureCount: record.consecutiveFailureCount,
      nextRunAt: record.nextRunAt,
      lastRunStartedAt: record.lastRunStartedAt,
      pausedAt: record.pausedAt,
      sourceToolCallId: record.sourceToolCallId,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    });
  }

  toRecord(domain: Routine): RoutineRecord {
    const record = new RoutineRecord();
    record.id = domain.id;
    record.userId = domain.userId;
    record.orgId = domain.orgId;
    record.name = domain.name;
    record.prompt = domain.prompt;
    record.modelId = domain.modelId;
    record.dailyTime = domain.dailyTime;
    record.internetEnabled = domain.internetEnabled;
    record.enabled = domain.enabled;
    record.lastRunStatus = domain.lastRunStatus;
    record.lastRunAt = domain.lastRunAt;
    record.lastRunFailureReason = domain.lastRunFailureReason;
    record.consecutiveFailureCount = domain.consecutiveFailureCount;
    record.nextRunAt = domain.nextRunAt;
    record.lastRunStartedAt = domain.lastRunStartedAt;
    record.pausedAt = domain.pausedAt;
    record.sourceToolCallId = domain.sourceToolCallId;
    record.createdAt = domain.createdAt;
    record.updatedAt = domain.updatedAt;
    return record;
  }
}
