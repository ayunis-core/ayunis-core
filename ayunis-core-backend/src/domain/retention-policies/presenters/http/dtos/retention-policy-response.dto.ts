import { ApiProperty } from '@nestjs/swagger';
import { ALLOWED_RETENTION_DAYS } from '../../../domain/retention-period';

export class RetentionPolicyResponseDto {
  @ApiProperty({
    description:
      'Configured retention window in days, or null when retention is ' +
      'disabled (data kept forever).',
    type: Number,
    nullable: true,
    example: 90,
  })
  retentionDays: number | null;

  @ApiProperty({
    description: 'Whether retention is currently enabled for the org.',
    example: true,
  })
  enabled: boolean;

  @ApiProperty({
    description:
      'Retention windows (in days) the admin may choose from. Lets the UI ' +
      'render the selector without hardcoding the allowlist.',
    type: [Number],
    example: [...ALLOWED_RETENTION_DAYS],
  })
  allowedRetentionDays: number[];
}
