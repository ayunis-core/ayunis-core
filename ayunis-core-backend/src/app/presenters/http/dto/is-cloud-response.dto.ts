import { ApiProperty } from '@nestjs/swagger';

export class IsCloudResponseDto {
  @ApiProperty({
    description: 'Whether the deployment is running in a cloud environment',
    example: true,
  })
  isCloud: boolean;

  @ApiProperty({
    description: 'Whether new user registration is disabled',
    example: false,
  })
  isRegistrationDisabled: boolean;
}
