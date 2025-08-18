import { ApiProperty } from '@nestjs/swagger';

export class IsCloudResponseDto {
  @ApiProperty({
    description: 'Whether the deployment is running in a cloud environment',
    example: true,
  })
  isCloud: boolean;
}
