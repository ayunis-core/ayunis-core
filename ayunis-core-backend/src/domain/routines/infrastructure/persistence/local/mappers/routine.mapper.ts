import { Injectable } from '@nestjs/common';
import { Routine } from 'src/domain/routines/domain/routine.entity';
import { McpIntegrationRecord } from 'src/domain/mcp/infrastructure/persistence/postgres/schema/mcp-integration.record';
import { KnowledgeBaseRecord } from 'src/domain/knowledge-bases/infrastructure/persistence/local/schema/knowledge-base.record';
import { RoutineRecord } from 'src/domain/routines/infrastructure/persistence/local/schema/routine.record';
import {
  ROUTINE_LAST_MONTH_DAY,
  RoutineFrequency,
  routineMonthDay,
  routineWeekdays,
  type RoutineSchedule,
} from 'src/domain/routines/domain/routine-frequency';

/** The stored month day of the last day, as RRULE's BYMONTHDAY=-1. */
const LAST_MONTH_DAY_COLUMN = -1;

export type RoutineScheduleColumns = Pick<
  RoutineRecord,
  'frequency' | 'dailyTime' | 'weekdays' | 'monthDay'
>;

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
      schedule: this.scheduleToDomain(record),
      internetAccess: record.internetAccess,
      allowedDomains: record.allowedDomains,
      mcpIntegrationIds: record.mcpIntegrationIds ?? [],
      knowledgeBaseIds: record.knowledgeBaseIds ?? [],
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
    Object.assign(record, this.scheduleToRecord(domain.schedule));
    record.internetAccess = domain.internetAccess;
    record.allowedDomains = domain.allowedDomains;
    record.mcpIntegrations = domain.mcpIntegrationIds.map(
      (id) => ({ id }) as McpIntegrationRecord,
    );
    record.knowledgeBases = domain.knowledgeBaseIds.map(
      (id) => ({ id }) as KnowledgeBaseRecord,
    );
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

  scheduleToDomain(record: RoutineScheduleColumns): RoutineSchedule {
    const time = record.dailyTime;
    switch (record.frequency) {
      case RoutineFrequency.DAILY:
        return { frequency: record.frequency, time };
      case RoutineFrequency.WEEKLY:
        return { frequency: record.frequency, time, weekdays: record.weekdays };
      case RoutineFrequency.MONTHLY:
        return {
          frequency: record.frequency,
          time,
          monthDay:
            record.monthDay === LAST_MONTH_DAY_COLUMN
              ? ROUTINE_LAST_MONTH_DAY
              : (record.monthDay as number),
        };
    }
  }

  /** Every column, so a changed frequency clears the previous one's fields. */
  scheduleToRecord(schedule: RoutineSchedule): RoutineScheduleColumns {
    const monthDay = routineMonthDay(schedule);
    return {
      frequency: schedule.frequency,
      dailyTime: schedule.time,
      weekdays: routineWeekdays(schedule),
      monthDay:
        monthDay === ROUTINE_LAST_MONTH_DAY ? LAST_MONTH_DAY_COLUMN : monthDay,
    };
  }
}
