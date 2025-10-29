import { ApiProperty } from '@nestjs/swagger';

export class UsageConfigDto {
  @ApiProperty({
    description: 'Whether cost information should be displayed',
    example: true,
  })
  showCostInformation: boolean;

  @ApiProperty({
    description: 'Current deployment mode',
    example: 'self-hosted',
    enum: ['cloud', 'self-hosted', 'unknown'],
  })
  deploymentMode: 'cloud' | 'self-hosted' | 'unknown';
}
