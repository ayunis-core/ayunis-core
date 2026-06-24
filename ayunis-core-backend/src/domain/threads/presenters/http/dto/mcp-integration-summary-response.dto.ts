import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class McpIntegrationSummaryResponseDto {
  @ApiProperty({
    description: 'Unique identifier for the MCP integration',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  id: string;

  @ApiProperty({
    description: 'Name of the MCP integration',
    example: 'OParl Council Data',
  })
  name: string;

  @ApiPropertyOptional({
    description: 'Logo URL for marketplace integrations',
    type: 'string',
    nullable: true,
    example: 'https://marketplace.ayunis.de/logos/oparl.png',
  })
  logoUrl?: string | null;
}
