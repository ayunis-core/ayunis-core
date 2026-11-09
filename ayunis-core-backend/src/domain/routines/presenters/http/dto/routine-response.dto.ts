import { ApiProperty } from '@nestjs/swagger';
import { RoutineRunStatus } from 'src/domain/routines/domain/routine-run-status.enum';

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
      "Permitted model id; null when the routine uses the user's default model, which is also the case once its model was removed",
  })
  modelId: string | null;

  @ApiProperty({ description: 'HH:mm (Europe/Berlin)', example: '07:30' })
  dailyTime: string;

  @ApiProperty()
  internetEnabled: boolean;

  @ApiProperty({
    type: [String],
    format: 'uuid',
    description: 'Integrations whose tools the routine may use',
  })
  mcpIntegrationIds: string[];

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
      'When the next scheduled run starts: the daily time plus a per-routine offset of up to 9 minutes. Null while the routine is disabled.',
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

  @ApiProperty()
  createdAt: string;

  @ApiProperty()
  updatedAt: string;
}
