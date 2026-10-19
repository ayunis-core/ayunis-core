import { Injectable } from '@nestjs/common';
import { Org } from 'src/iam/orgs/domain/org.entity';
import {
  SuperAdminOrgListResponseDto,
  SuperAdminOrgOverviewResponseDto,
  SuperAdminOrgResponseDto,
} from 'src/iam/orgs/presenters/http/dtos/super-admin-org-response.dto';
import type { SuperAdminOrgList } from 'src/iam/orgs/application/models/super-admin-org-list';
import type { SuperAdminOrgOverview } from 'src/iam/orgs/application/models/super-admin-org-overview';

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

  toOverviewDto({
    org,
    lifecycleStatus,
  }: SuperAdminOrgOverview): SuperAdminOrgOverviewResponseDto {
    return { ...this.toDto(org), lifecycleStatus };
  }

  toListDto({
    page,
    lifecycleCounts,
  }: SuperAdminOrgList): SuperAdminOrgListResponseDto {
    return {
      data: page.data.map((overview) => this.toOverviewDto(overview)),
      pagination: {
        limit: page.limit,
        offset: page.offset,
        total: page.total,
      },
      lifecycleCounts,
    };
  }
}
