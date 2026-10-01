import { Injectable } from '@nestjs/common';
import { Org } from 'src/iam/orgs/domain/org.entity';
import {
  SuperAdminOrgListResponseDto,
  SuperAdminOrgResponseDto,
} from 'src/iam/orgs/presenters/http/dtos/super-admin-org-response.dto';
import { Paginated } from 'src/common/pagination/paginated.entity';

@Injectable()
export class SuperAdminOrgResponseDtoMapper {
  toDto(org: Org): SuperAdminOrgResponseDto {
    return {
      id: org.id,
      name: org.name,
      archived: org.archived,
      createdAt: org.createdAt,
    };
  }

  toPaginatedDto(paginated: Paginated<Org>): SuperAdminOrgListResponseDto {
    return {
      data: paginated.data.map((org) => this.toDto(org)),
      pagination: {
        limit: paginated.limit,
        offset: paginated.offset,
        total: paginated.total,
      },
    };
  }
}
