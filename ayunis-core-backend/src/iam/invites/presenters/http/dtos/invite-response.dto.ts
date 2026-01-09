import { ApiProperty } from '@nestjs/swagger';
import { UUID } from 'crypto';
import { UserRole } from '../../../../users/domain/value-objects/role.object';
import { PaginationDto } from 'src/common/pagination/pagination.dto';

export enum InviteStatus {
  PENDING = 'pending',
  ACCEPTED = 'accepted',
  EXPIRED = 'expired',
}

export class InviteResponseDto {
  @ApiProperty({
    description: 'Unique identifier of the invite',
    example: '123e4567-e89b-12d3-a456-426614174000',
    format: 'uuid',
  })
  id: UUID;

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
    description: 'Current status of the invite',
    enum: InviteStatus,
    example: InviteStatus.PENDING,
  })
  status: InviteStatus;

  @ApiProperty({
    description: 'Date when the invite was sent',
    example: '2023-12-01T10:00:00Z',
  })
  sentDate: Date;

  @ApiProperty({
    description: 'Date when the invite expires',
    example: '2023-12-08T10:00:00Z',
  })
  expiresAt: Date;

  @ApiProperty({
    description: 'Date when the invite was accepted (if applicable)',
    example: '2023-12-02T15:30:00Z',
    required: false,
  })
  acceptedAt?: Date;
}

export class InviteDetailResponseDto extends InviteResponseDto {
  @ApiProperty({
    description: 'Name of the organization',
    example: 'Acme Corporation',
  })
  organizationName: string;
}

export class AcceptInviteResponseDto {
  @ApiProperty({
    description: 'ID of the accepted invite',
    example: '123e4567-e89b-12d3-a456-426614174000',
    format: 'uuid',
  })
  inviteId: string;

  @ApiProperty({
    description: 'Email of the user who accepted the invite',
    example: 'user@example.com',
  })
  email: string;

  @ApiProperty({
    description: 'Organization ID the user was invited to',
    example: '123e4567-e89b-12d3-a456-426614174000',
    format: 'uuid',
  })
  orgId: string;
}

export class PaginatedInvitesListResponseDto {
  @ApiProperty({
    description: 'Array of invites for the current page',
    type: [InviteResponseDto],
  })
  data: InviteResponseDto[];

  @ApiProperty({
    description: 'Pagination metadata',
    type: PaginationDto,
  })
  pagination: PaginationDto;
}
