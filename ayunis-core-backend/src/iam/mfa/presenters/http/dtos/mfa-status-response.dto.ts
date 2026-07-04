import { ApiProperty } from '@nestjs/swagger';

export class MfaStatusResponseDto {
  @ApiProperty({
    description: 'Whether the user has confirmed TOTP two-factor auth.',
    example: true,
  })
  enabled: boolean;

  @ApiProperty({
    description: 'When enrollment was confirmed, null when not enrolled.',
    type: String,
    format: 'date-time',
    nullable: true,
  })
  confirmedAt: Date | null;

  @ApiProperty({
    description: 'Number of unused recovery codes.',
    example: 10,
  })
  recoveryCodesRemaining: number;
}
