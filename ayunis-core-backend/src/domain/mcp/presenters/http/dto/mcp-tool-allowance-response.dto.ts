import { ApiProperty } from '@nestjs/swagger';

export class McpToolAllowanceResponseDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ format: 'uuid' })
  integrationId: string;

  @ApiProperty({ example: 'OParl Council Data' })
  integrationName: string;

  @ApiProperty({
    type: 'string',
    nullable: true,
    description: 'Logo URL for marketplace integrations',
    example: 'https://marketplace.ayunis.com/logos/oparl.png',
  })
  integrationLogoUrl: string | null;

  @ApiProperty({
    description: 'Tool name as reported by the MCP server',
    example: 'search_meetings',
  })
  toolName: string;
}
