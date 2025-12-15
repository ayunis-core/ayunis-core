import { ApiProperty } from '@nestjs/swagger';

export class UsageConfigResponseDto {
  @ApiProperty({
    description:
      'Whether the deployment is self-hosted. Determines feature availability.',
    example: true,
  })
  isSelfHosted: boolean;
}
