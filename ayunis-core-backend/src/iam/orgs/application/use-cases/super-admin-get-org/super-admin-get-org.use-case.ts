import { Injectable, Logger } from '@nestjs/common';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import { ContextService } from 'src/common/context/services/context.service';
import {
  getUserContext,
  isSuperAdmin,
} from 'src/common/context/required-context';
import {
  OrgUnauthorizedError,
  UnexpectedOrgError,
} from 'src/iam/orgs/application/orgs.errors';
import type { SuperAdminOrgOverview } from 'src/iam/orgs/application/models/super-admin-org-overview';
import { OrgsRepository } from 'src/iam/orgs/application/ports/orgs.repository';
import { SuperAdminGetOrgQuery } from './super-admin-get-org.query';

@Injectable()
export class SuperAdminGetOrgUseCase {
  private readonly logger = new Logger(SuperAdminGetOrgUseCase.name);

  constructor(
    private readonly orgsRepository: OrgsRepository,
    private readonly contextService: ContextService,
  ) {}

  @HandleUnexpectedErrors(UnexpectedOrgError)
  async execute(query: SuperAdminGetOrgQuery): Promise<SuperAdminOrgOverview> {
    this.logger.log({ id: query.id }, 'superAdminGetOrg');

    if (!isSuperAdmin(this.contextService)) {
      this.logger.warn(
        { systemRole: getUserContext(this.contextService)?.systemRole },
        'Non-super admin attempted to read an org',
      );
      throw new OrgUnauthorizedError('Super admin privileges required');
    }

    const org = await this.orgsRepository.findById(query.id);
    const statuses = await this.orgsRepository.findLifecycleStatuses([org.id]);
    return { org, lifecycleStatus: statuses.get(org.id) ?? 'no-plan' };
  }
}
