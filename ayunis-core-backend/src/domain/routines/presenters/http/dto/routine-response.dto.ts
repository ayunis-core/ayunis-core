import { ApiProperty } from '@nestjs/swagger';
import { RoutineRunStatus } from 'src/domain/routines/domain/routine-run-status.enum';
import { RoutineInternetAccess } from 'src/domain/routines/domain/routine-internet-access';
import { ModelMode } from 'src/domain/models/domain/value-objects/model-mode.enum';
import { RoutineScheduleDto } from './routine-schedule.dto';

export class RoutineResponseDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  prompt: string;

  @ApiProperty({
    type: String,
    format: 'uuid',
    nullable: true,
    description:
      "Permitted model id; null when the routine uses a mode or the user's default model, which is also the case once its model was removed",
  })
  modelId: string | null;

  @ApiProperty({
    enum: ModelMode,
    enumName: 'ModelMode',
    nullable: true,
    description:
      "Model mode resolved for each run; null when the routine uses `modelId` or the user's default model",
  })
  mode: ModelMode | null;

  @ApiProperty({ type: RoutineScheduleDto })
  schedule: RoutineScheduleDto;

  @ApiProperty({
    enum: RoutineInternetAccess,
    enumName: 'RoutineInternetAccess',
  })
  internetAccess: RoutineInternetAccess;

  @ApiProperty({
    type: [String],
    description:
      'Normalized hosts the routine may access, with their subdomains; applied only in `allowlist` mode',
    example: ['nrw.de'],
  })
  allowedDomains: string[];

  @ApiProperty()
  enabled: boolean;

  @ApiProperty({
    enum: RoutineRunStatus,
    enumName: 'RoutineRunStatus',
    nullable: true,
    description: 'Null until the routine ran for the first time',
  })
  lastRunStatus: RoutineRunStatus | null;

  @ApiProperty({
    type: String,
    nullable: true,
    description: 'When the last run finished',
    example: '2026-11-06T06:30:12.000Z',
  })
  lastRunAt: string | null;

  @ApiProperty({
    type: String,
    nullable: true,
    description:
      'Machine-readable reason of the last failed run, e.g. `timeout` or `finish_routine_not_called`',
  })
  lastRunFailureReason: string | null;

  @ApiProperty()
  consecutiveFailureCount: number;

  @ApiProperty({
    type: String,
    nullable: true,
    description:
      'When the next scheduled run starts: the set time on the next day the schedule matches, plus a per-routine offset of up to 9 minutes. Null while the routine is disabled.',
    example: '2026-11-07T06:34:00.000Z',
  })
  nextRunAt: string | null;

  @ApiProperty({
    type: String,
    nullable: true,
    description:
      'When repeated failed runs paused (disabled) the routine; null once it is enabled again',
  })
  pausedAt: string | null;

  @ApiProperty({
    type: String,
    nullable: true,
    description:
      'The chat `create_routine` tool call the routine was created from; null when it was created elsewhere',
  })
  sourceToolCallId: string | null;

  @ApiProperty()
  createdAt: string;

  @ApiProperty()
  updatedAt: string;
}
