import { ApiProperty } from '@nestjs/swagger';
import { PaginationDto } from 'src/common/pagination';

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

  @ApiProperty({
    type: String,
    format: 'date-time',
    description: 'Last activity date (null if no activity)',
    nullable: true,
  })
  lastActivity: Date | null;

  @ApiProperty({ description: 'Whether the user is considered active' })
  isActive: boolean;
}

export class UserUsageResponseDto {
  @ApiProperty({ description: 'User usage statistics', type: [UserUsageDto] })
  data: UserUsageDto[];

  @ApiProperty({ description: 'Pagination metadata', type: PaginationDto })
  pagination: PaginationDto;
}
