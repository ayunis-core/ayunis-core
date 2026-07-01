import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsString, MaxLength } from 'class-validator';
import { APP_ALERT_MESSAGE_MAX_LENGTH } from '../../../domain/app-alert';

export class SetAppAlertRequestDto {
  @ApiProperty({
    description: 'Whether to show the app-wide alert banner',
    example: true,
  })
  @IsBoolean()
  enabled: boolean;

  @ApiProperty({
    description:
      'The alert banner text. Required (non-empty) when enabled is true.',
    example: 'The system is currently experiencing degraded performance.',
    maxLength: APP_ALERT_MESSAGE_MAX_LENGTH,
  })
  @IsString()
  @MaxLength(APP_ALERT_MESSAGE_MAX_LENGTH)
  message: string;
}
