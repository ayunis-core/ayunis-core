import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { UnexpectedOrgError } from 'src/iam/orgs/application/orgs.errors';
import { Injectable, Logger } from '@nestjs/common';
import { OrgsRepository } from 'src/iam/orgs/application/ports/orgs.repository';
import { ContextService } from 'src/common/context/services/context.service';
import {
  getUserContext,
  isSuperAdmin,
} from 'src/common/context/required-context';
import { OrgUnauthorizedError } from 'src/iam/orgs/application/orgs.errors';
import { SuperAdminGetAllOrgsQuery } from './super-admin-get-all-orgs.query';
import { Paginated } from 'src/common/pagination/paginated.entity';
import type { SuperAdminOrgListItem } from 'src/iam/orgs/application/models/super-admin-org-list-item';

@Injectable()
export class SuperAdminGetAllOrgsUseCase {
  private readonly logger = new Logger(SuperAdminGetAllOrgsUseCase.name);

  constructor(
    private readonly orgsRepository: OrgsRepository,
    private readonly contextService: ContextService,
  ) {}

  @HandleUnexpectedErrors(UnexpectedOrgError)
  async execute(
    query: SuperAdminGetAllOrgsQuery,
  ): Promise<Paginated<SuperAdminOrgListItem>> {
    this.logger.log(
      {
        limit: query.limit,
        offset: query.offset,
        text: query.search,
      },
      'superAdminGetAllOrgs',
    );

    if (!isSuperAdmin(this.contextService)) {
      this.logger.warn(
        {
          systemRole: getUserContext(this.contextService)?.systemRole,
        },
        'Non-super admin attempted to list all orgs',
      );
      throw new OrgUnauthorizedError('Super admin privileges required');
    }

    const page = await this.orgsRepository.findAllForSuperAdmin(
      {
        limit: query.limit,
        offset: query.offset,
      },
      {
        search: query.search,
        lifecycle: query.lifecycle,
      },
    );

    const statuses = await this.orgsRepository.findLifecycleStatuses(
      page.data.map((org) => org.id),
    );
    return new Paginated<SuperAdminOrgListItem>({
      data: page.data.map((org) => ({
        org,
        lifecycleStatus: statuses.get(org.id) ?? 'no-plan',
      })),
      limit: page.limit,
      offset: page.offset,
      total: page.total,
    });
  }
}
