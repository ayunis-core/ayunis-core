import { Injectable } from '@nestjs/common';
import { Org } from '../../../domain/org.entity';
import {
  SuperAdminOrgListResponseDto,
  SuperAdminOrgResponseDto,
} from '../dtos/super-admin-org-response.dto';
import { Paginated } from 'src/common/pagination/paginated.entity';

@Injectable()
export class SuperAdminOrgResponseDtoMapper {
  toDto(org: Org): SuperAdminOrgResponseDto {
    return {
      id: org.id,
      name: org.name,
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
