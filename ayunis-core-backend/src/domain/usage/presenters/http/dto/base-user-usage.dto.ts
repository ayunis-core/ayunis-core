import { ApiProperty } from '@nestjs/swagger';

export class BaseUserUsageDto {
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
