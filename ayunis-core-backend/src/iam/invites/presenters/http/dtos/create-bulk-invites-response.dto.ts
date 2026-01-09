import { ApiProperty } from '@nestjs/swagger';
import { UserRole } from '../../../../users/domain/value-objects/role.object';

export class BulkInviteResultDto {
  @ApiProperty({
    description: 'Email address of the invited user',
    example: 'user@example.com',
  })
  email: string;

  @ApiProperty({
    description: 'Role assigned to the invited user',
    enum: UserRole,
    example: UserRole.USER,
  })
  role: UserRole;

  @ApiProperty({
    description: 'Whether the invite was created successfully',
    example: true,
  })
  success: boolean;

  @ApiProperty({
    description:
      'Invitation URL (only populated when email configuration is unavailable)',
    type: 'string',
    nullable: true,
    example: 'https://app.example.com/accept-invite?token=abc123',
  })
  url: string | null;

  @ApiProperty({
    description: 'Error code if the invite failed',
    type: 'string',
    nullable: true,
    example: 'EMAIL_NOT_AVAILABLE',
  })
  errorCode: string | null;

  @ApiProperty({
    description: 'Error message if the invite failed',
    type: 'string',
    nullable: true,
    example: 'Email is already registered',
  })
  errorMessage: string | null;
}

export class CreateBulkInvitesResponseDto {
  @ApiProperty({
    description: 'Total number of invites in the request',
    example: 10,
  })
  totalCount: number;

  @ApiProperty({
    description: 'Number of invites created successfully',
    example: 8,
  })
  successCount: number;

  @ApiProperty({
    description: 'Number of invites that failed',
    example: 2,
  })
  failureCount: number;

  @ApiProperty({
    description: 'Individual results for each invite',
    type: [BulkInviteResultDto],
  })
  results: BulkInviteResultDto[];
}
