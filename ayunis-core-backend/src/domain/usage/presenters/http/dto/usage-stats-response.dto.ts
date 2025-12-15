import { ApiProperty } from '@nestjs/swagger';

export class UsageStatsResponseDto {
  @ApiProperty({
    description:
      'Total tokens consumed across all users and models in the specified period',
    example: 1250000,
  })
  totalTokens: number;

  @ApiProperty({
    description: 'Total number of API requests made in the specified period',
    example: 3450,
  })
  totalRequests: number;

  @ApiProperty({
    description:
      'Number of users who made requests within the active user threshold (last 30 days)',
    example: 42,
  })
  activeUsers: number;

  @ApiProperty({
    description:
      'Total number of unique users who made requests in the specified period',
    example: 67,
  })
  totalUsers: number;

  @ApiProperty({
    description:
      'List of the most frequently used model names, ordered by usage',
    type: [String],
    example: ['gpt-4', 'claude-3-sonnet', 'gpt-3.5-turbo'],
  })
  topModels: string[];
}
