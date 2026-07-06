import { ApiProperty } from '@nestjs/swagger';
import { UUID } from 'crypto';

export abstract class BaseCreditLimitResponseDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  id: UUID;

  @ApiProperty({ example: 5000 })
  monthlyCredits: number;
}

export class UserCreditLimitResponseDto extends BaseCreditLimitResponseDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440001' })
  userId: UUID;
}

export class TeamCreditLimitResponseDto extends BaseCreditLimitResponseDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440002' })
  teamId: UUID;
}
