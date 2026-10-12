import { ApiProperty } from '@nestjs/swagger';

export class UsageConfigResponseDto {
  @ApiProperty({
    description:
      'Whether the deployment is self-hosted. Determines feature availability.',
    example: true,
  })
  isSelfHosted: boolean;

  @ApiProperty({
    description: 'Whether individual usage is hidden for this organisation',
    default: false,
  })
  hideIndividualUsage: boolean;
}
