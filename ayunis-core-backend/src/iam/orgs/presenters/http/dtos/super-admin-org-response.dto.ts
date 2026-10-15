import { ApiProperty } from '@nestjs/swagger';
import { UUID } from 'crypto';
import { PaginationDto } from 'src/common/pagination/pagination.dto';
import {
  ORG_LIFECYCLE_STATUSES,
  type OrgLifecycleStatus,
} from 'src/iam/orgs/application/models/org-lifecycle-status';

export class SuperAdminOrgResponseDto {
  @ApiProperty({
    description: 'Organization unique identifier',
    format: 'uuid',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  id: UUID;

  @ApiProperty({
    description: 'Organization display name',
    example: 'Acme Corporation',
  })
  name: string;

  @ApiProperty({ description: 'Whether the organisation is archived' })
  archived: boolean;

  @ApiProperty({
    description: 'Whether individual usage is hidden from organisation admins',
    default: false,
  })
  hideIndividualUsage: boolean;

  @ApiProperty({
    description: 'Date when the organization was created',
    example: '2024-01-15T10:30:00Z',
    type: Date,
  })
  createdAt: Date;
}

export class SuperAdminOrgOverviewResponseDto extends SuperAdminOrgResponseDto {
  @ApiProperty({
    enum: ORG_LIFECYCLE_STATUSES,
    enumName: 'OrgLifecycleStatus',
    description:
      'Derived lifecycle status: archived, then paying, then expired, then trial, otherwise no-plan',
  })
  lifecycleStatus: OrgLifecycleStatus;
}

export class SuperAdminOrgListResponseDto {
  @ApiProperty({
    description: 'Array of organizations for the current page',
    type: [SuperAdminOrgOverviewResponseDto],
  })
  data: SuperAdminOrgOverviewResponseDto[];

  @ApiProperty({
    description: 'Pagination metadata',
    type: PaginationDto,
  })
  pagination: PaginationDto;
}
