import { ApiProperty } from '@nestjs/swagger';

/**
 * Response DTO for MCP integration validation results.
 */
export class ValidationResponseDto {
  @ApiProperty({
    description: 'Whether the integration validation succeeded',
    example: true,
  })
  valid: boolean;

  @ApiProperty({
    description: 'Discovered capabilities from the MCP server',
    example: { tools: 5, resources: 3, prompts: 2 },
  })
  capabilities: {
    tools: number;
    resources: number;
    prompts: number;
  };

  @ApiProperty({
    description: 'Error message if validation failed',
    required: false,
    example: 'Connection timeout',
  })
  error?: string;
}
