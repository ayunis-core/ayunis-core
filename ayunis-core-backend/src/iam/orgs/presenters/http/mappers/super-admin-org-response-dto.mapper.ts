import { Injectable } from '@nestjs/common';
import { Org } from '../../../domain/org.entity';
import {
  SuperAdminOrgListResponseDto,
  SuperAdminOrgResponseDto,
} from '../dtos/super-admin-org-response.dto';
import { Paginated } from 'src/common/pagination';

@Injectable()
export class SuperAdminOrgResponseDtoMapper {
  toDto(org: Org): SuperAdminOrgResponseDto {
    return {
      id: org.id,
      name: org.name,
      createdAt: org.createdAt,
    };
  }

  toListDto(paginatedOrgs: Paginated<Org>): SuperAdminOrgListResponseDto {
    return {
      orgs: paginatedOrgs.data.map((org) => this.toDto(org)),
      pagination: {
        limit: paginatedOrgs.limit,
        offset: paginatedOrgs.offset,
        total: paginatedOrgs.total,
      },
    };
  }
}
