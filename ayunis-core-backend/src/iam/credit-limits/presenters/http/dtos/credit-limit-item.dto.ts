import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UUID } from 'crypto';

export class UserCreditLimitItemDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440001' })
  userId: UUID;

  @ApiProperty({ example: 'Jane Doe' })
  name: string;

  @ApiProperty({ example: 'jane.doe@example.com' })
  email: string;

  @ApiProperty({
    description: 'Configured monthly credit limit',
    example: 5000,
  })
  monthlyCredits: number;

  @ApiPropertyOptional({
    description:
      'Credits consumed in the current calendar month; omitted when individual usage is hidden',
    example: 1240,
  })
  creditsUsed?: number;
}

export class ApiKeyCreditLimitItemDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440003' })
  apiKeyId: UUID;

  @ApiProperty({ example: 'Finance export' })
  name: string;

  @ApiProperty({
    description: 'Configured monthly credit limit',
    example: 5000,
  })
  monthlyCredits: number;

  @ApiProperty({
    description: 'Credits consumed in the current calendar month',
    example: 1240,
  })
  creditsUsed: number;
}

export class TeamCreditLimitItemDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440002' })
  teamId: UUID;

  @ApiProperty({ example: 'Engineering' })
  name: string;

  @ApiProperty({
    description: 'Configured monthly credit limit',
    example: 20000,
  })
  monthlyCredits: number;

  @ApiPropertyOptional({
    description:
      'Credits consumed by all current team members in the current month; omitted when individual usage is hidden',
    example: 8300,
  })
  creditsUsed?: number;
}
