import { ApiProperty } from '@nestjs/swagger';
import { UUID } from 'crypto';
import { CreditLimitScope } from '../../../domain/value-objects/credit-limit-scope.enum';

export class CreditLimitResponseDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  id: UUID;

  @ApiProperty({ enum: CreditLimitScope, example: CreditLimitScope.USER })
  scope: CreditLimitScope;

  @ApiProperty({
    description: 'Set when scope is USER',
    example: '550e8400-e29b-41d4-a716-446655440001',
    nullable: true,
  })
  targetUserId: UUID | null;

  @ApiProperty({
    description: 'Set when scope is TEAM',
    example: '550e8400-e29b-41d4-a716-446655440002',
    nullable: true,
  })
  targetTeamId: UUID | null;

  @ApiProperty({ example: 5000 })
  monthlyCredits: number;
}
