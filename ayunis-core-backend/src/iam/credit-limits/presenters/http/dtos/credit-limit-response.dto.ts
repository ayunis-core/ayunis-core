import { ApiProperty } from '@nestjs/swagger';
import { UUID } from 'crypto';
import { CreditLimitScope } from 'src/iam/credit-limits/domain/value-objects/credit-limit-scope.enum';

export abstract class CreditLimitScopeResponseDto {
  @ApiProperty({ enum: CreditLimitScope, enumName: 'CreditLimitScope' })
  scope: CreditLimitScope;
}

export abstract class BaseCreditLimitResponseDto extends CreditLimitScopeResponseDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  id: UUID;

  @ApiProperty({ example: 5000 })
  monthlyCredits: number;
}

export class UserCreditLimitResponseDto extends BaseCreditLimitResponseDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440001' })
  userId: UUID;
}

export class ApiKeyCreditLimitResponseDto extends BaseCreditLimitResponseDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440003' })
  apiKeyId: UUID;
}

export class TeamCreditLimitResponseDto extends BaseCreditLimitResponseDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440002' })
  teamId: UUID;
}

export class DefaultUserCreditLimitResponseDto extends CreditLimitScopeResponseDto {
  @ApiProperty({
    description:
      'Personal limit for every user without an individual limit; ' +
      'null when no default is set.',
    example: 100,
    type: Number,
    nullable: true,
  })
  monthlyCredits: number | null;
}
