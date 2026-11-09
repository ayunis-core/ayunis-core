import { Injectable } from '@nestjs/common';
import type { Routine } from 'src/domain/routines/domain/routine.entity';
import { RoutineResponseDto } from 'src/domain/routines/presenters/http/dto/routine-response.dto';

@Injectable()
export class RoutineDtoMapper {
  toDto(routine: Routine): RoutineResponseDto {
    return {
      id: routine.id,
      name: routine.name,
      prompt: routine.prompt,
      modelId: routine.modelId,
      dailyTime: routine.dailyTime,
      internetEnabled: routine.internetEnabled,
      mcpIntegrationIds: routine.mcpIntegrationIds,
      enabled: routine.enabled,
      lastRunStatus: routine.lastRunStatus,
      lastRunAt: routine.lastRunAt?.toISOString() ?? null,
      lastRunFailureReason: routine.lastRunFailureReason,
      consecutiveFailureCount: routine.consecutiveFailureCount,
      nextRunAt: routine.nextRunAt?.toISOString() ?? null,
      pausedAt: routine.pausedAt?.toISOString() ?? null,
      createdAt: routine.createdAt.toISOString(),
      updatedAt: routine.updatedAt.toISOString(),
    };
  }
}
