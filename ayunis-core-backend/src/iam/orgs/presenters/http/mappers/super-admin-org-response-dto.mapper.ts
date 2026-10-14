import { Injectable } from '@nestjs/common';
import { Org } from 'src/iam/orgs/domain/org.entity';
import {
  SuperAdminOrgListResponseDto,
  SuperAdminOrgResponseDto,
} from 'src/iam/orgs/presenters/http/dtos/super-admin-org-response.dto';
import { Paginated } from 'src/common/pagination/paginated.entity';
import type { SuperAdminOrgListItem } from 'src/iam/orgs/application/models/super-admin-org-list-item';

@Injectable()
export class SuperAdminOrgResponseDtoMapper {
  toDto(org: Org): SuperAdminOrgResponseDto {
    return {
      id: org.id,
      name: org.name,
      archived: org.archived,
      hideIndividualUsage: org.hideIndividualUsage,
      createdAt: org.createdAt,
    };
  }

  toPaginatedDto(
    paginated: Paginated<SuperAdminOrgListItem>,
  ): SuperAdminOrgListResponseDto {
    return {
      data: paginated.data.map(({ org, paying }) => ({
        ...this.toDto(org),
        paying,
      })),
      pagination: {
        limit: paginated.limit,
        offset: paginated.offset,
        total: paginated.total,
      },
    };
  }
}
