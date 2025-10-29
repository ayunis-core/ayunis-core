import { ApiProperty } from '@nestjs/swagger';

export class IntegrationHealthDto {
  @ApiProperty({
    description: 'Integration ID',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  })
  id: string;

  @ApiProperty({
    description: 'Integration name',
    example: 'GitHub MCP',
  })
  name: string;

  @ApiProperty({
    description: 'Integration type',
    enum: ['predefined', 'custom'],
    example: 'predefined',
  })
  type: 'predefined' | 'custom';

  @ApiProperty({
    description: 'Health status',
    enum: ['healthy', 'unhealthy'],
    example: 'healthy',
  })
  status: 'healthy' | 'unhealthy';

  @ApiProperty({
    description: 'Last checked timestamp',
    example: '2025-10-28T12:00:00Z',
  })
  lastChecked: Date;

  @ApiProperty({
    description: 'Whether integration is enabled',
    example: true,
  })
  enabled: boolean;
}

export class McpHealthResponseDto {
  @ApiProperty({
    description: 'Overall health status',
    enum: ['healthy', 'unhealthy'],
    example: 'healthy',
  })
  status: 'healthy' | 'unhealthy';

  @ApiProperty({
    description: 'Health check timestamp',
    example: '2025-10-28T12:00:00Z',
  })
  timestamp: Date;

  @ApiProperty({
    description: 'Health status of individual integrations',
    type: [IntegrationHealthDto],
  })
  integrations: IntegrationHealthDto[];
}
