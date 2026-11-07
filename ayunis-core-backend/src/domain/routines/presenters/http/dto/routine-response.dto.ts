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
      "Permitted model id; null once that model was removed (the run then uses the user's default)",
  })
  modelId: string | null;

  @ApiProperty({ description: 'HH:mm (Europe/Berlin)', example: '07:30' })
  dailyTime: string;

  @ApiProperty()
  internetEnabled: boolean;

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

  @ApiProperty()
  createdAt: string;

  @ApiProperty()
  updatedAt: string;
}
