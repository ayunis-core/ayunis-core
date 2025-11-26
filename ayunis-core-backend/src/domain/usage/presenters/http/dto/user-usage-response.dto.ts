import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ModelProvider } from '../../../../models/domain/value-objects/model-provider.enum';
import { PaginationDto } from 'src/common/pagination';

export class ModelBreakdownDto {
  @ApiProperty({ description: 'Model ID' })
  modelId: string;

  @ApiProperty({ description: 'Model name' })
  modelName: string;

  @ApiProperty({ description: 'Model display name' })
  displayName: string;

  @ApiProperty({ enum: ModelProvider, description: 'Model provider' })
  provider: ModelProvider;

  @ApiProperty({ description: 'Tokens used for this model' })
  tokens: number;

  @ApiProperty({ description: 'Requests made to this model' })
  requests: number;

  @ApiPropertyOptional({
    description: 'Cost for this model (self-hosted mode only)',
  })
  cost?: number;

  @ApiProperty({ description: "Percentage of user's total usage" })
  percentage: number;
}

export class UserUsageDto {
  @ApiProperty({ description: 'User ID' })
  userId: string;

  @ApiProperty({ description: 'User name' })
  userName: string;

  @ApiProperty({ description: 'User email' })
  userEmail: string;

  @ApiProperty({ description: 'Total tokens for this user' })
  tokens: number;

  @ApiProperty({ description: 'Total requests for this user' })
  requests: number;

  @ApiPropertyOptional({
    description: 'Total cost for this user (self-hosted mode only)',
  })
  cost?: number;

  @ApiProperty({
    type: String,
    format: 'date-time',
    description: 'Last activity date (null if no activity)',
    nullable: true,
  })
  lastActivity: Date | null;

  @ApiProperty({ description: 'Whether the user is considered active' })
  isActive: boolean;

  @ApiProperty({
    description: 'Model breakdown for this user',
    type: [ModelBreakdownDto],
  })
  modelBreakdown: ModelBreakdownDto[];
}

export class UserUsageResponseDto {
  @ApiProperty({ description: 'User usage statistics', type: [UserUsageDto] })
  data: UserUsageDto[];

  @ApiProperty({ description: 'Pagination metadata', type: PaginationDto })
  pagination: PaginationDto;
}
