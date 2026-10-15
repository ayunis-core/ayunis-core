import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Min } from 'class-validator';
import {
  ORG_LIFECYCLE_STATUSES,
  type OrgLifecycleStatus,
} from 'src/iam/orgs/application/models/org-lifecycle-status';

const LIFECYCLE_FILTER_VALUES = ['all', ...ORG_LIFECYCLE_STATUSES];

export class SuperAdminGetAllOrgsQueryParamsDto {
  @ApiPropertyOptional({
    enum: LIFECYCLE_FILTER_VALUES,
    enumName: 'OrgLifecycleFilter',
    default: 'all',
    description:
      'Filter by derived lifecycle status: archived, then paying, then expired, then trial, otherwise no-plan',
  })
  @IsOptional()
  @IsIn(LIFECYCLE_FILTER_VALUES)
  lifecycle?: OrgLifecycleStatus | 'all';

  @ApiPropertyOptional({
    description: 'Search organizations by name, or by exact organization ID',
    example: 'Acme',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    description: 'Maximum number of organizations to return',
    example: 25,
    default: 50,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  limit?: number;

  @ApiPropertyOptional({
    description: 'Number of organizations to skip',
    example: 0,
    default: 0,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  offset?: number;
}
