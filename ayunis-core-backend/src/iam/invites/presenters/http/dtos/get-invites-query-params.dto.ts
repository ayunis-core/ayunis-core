import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Min } from 'class-validator';
import type { SortOrder } from 'src/common/sorting/sort';
import {
  SortByQueryParam,
  SortOrderQueryParam,
} from 'src/common/sorting/sort-query-params.decorators';
import { InvitesSortField } from 'src/iam/invites/domain/invites-sort-field.enum';

export class GetInvitesQueryParamsDto {
  @ApiPropertyOptional({
    description: 'Search invites by email',
    example: 'john@example.com',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    description: 'Maximum number of invites to return',
    example: 25,
    default: 25,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  limit?: number;

  @ApiPropertyOptional({
    description: 'Number of invites to skip',
    example: 0,
    default: 0,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  offset?: number;

  @SortByQueryParam(
    InvitesSortField,
    'InvitesSortField',
    InvitesSortField.CREATED_AT,
  )
  sortBy?: InvitesSortField;

  @SortOrderQueryParam()
  sortOrder?: SortOrder;
}
