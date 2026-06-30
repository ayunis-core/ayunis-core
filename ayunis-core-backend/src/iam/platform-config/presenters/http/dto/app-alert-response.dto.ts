import { ApiProperty } from '@nestjs/swagger';

export class AppAlertResponseDto {
  @ApiProperty({
    description: 'Whether the app-wide alert banner is currently shown',
    example: true,
  })
  enabled: boolean;

  @ApiProperty({
    description: 'The alert banner text shown to all users',
    example: 'The system is currently experiencing degraded performance.',
  })
  message: string;
}
