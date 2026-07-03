import { ApiProperty } from '@nestjs/swagger';
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

  @ApiProperty({
    description:
      'Credits consumed by all current team members in the current month',
    example: 8300,
  })
  creditsUsed: number;
}
