import { Injectable, Logger } from '@nestjs/common';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import type { Paginated } from 'src/common/pagination/paginated.entity';
import { UnexpectedAcademyAccessError } from 'src/iam/academy-access/application/academy-access.errors';
import type { OrgCertificateStatus } from 'src/iam/academy-access/application/models/org-certificate-status';
import { ContextService } from 'src/common/context/services/context.service';
import { getRequiredOrgId } from 'src/common/context/required-context';
import { OrgCertificateStatusesRepository } from 'src/iam/academy-access/application/ports/org-certificate-statuses.repository';
import { GetOrgAcademyAccessSettingsUseCase } from 'src/iam/academy-access/application/use-cases/get-org-academy-access-settings/get-org-academy-access-settings.use-case';
import { GetOrgAcademyAccessSettingsQuery } from 'src/iam/academy-access/application/use-cases/get-org-academy-access-settings/get-org-academy-access-settings.query';
import { buildOrgCertificateStatusesCriteria } from 'src/iam/academy-access/application/util/org-certificate-statuses-criteria';
import { ListOrgCertificateStatusesQuery } from './list-org-certificate-statuses.query';

/**
 * One page and its filtered total from the organization reporting query.
 */
@Injectable()
export class ListOrgCertificateStatusesUseCase {
  private readonly logger = new Logger(ListOrgCertificateStatusesUseCase.name);

  constructor(
    private readonly repository: OrgCertificateStatusesRepository,
    private readonly getOrgSettingsUseCase: GetOrgAcademyAccessSettingsUseCase,
    private readonly contextService: ContextService,
  ) {}

  @HandleUnexpectedErrors(UnexpectedAcademyAccessError)
  async execute(
    query: ListOrgCertificateStatusesQuery,
  ): Promise<Paginated<OrgCertificateStatus>> {
    const orgId = getRequiredOrgId(this.contextService);
    this.logger.log(
      {
        orgId,
        status: query.status,
      },
      'Listing org certificate statuses',
    );

    const settings = await this.getOrgSettingsUseCase.execute(
      new GetOrgAcademyAccessSettingsQuery(orgId),
    );
    return this.repository.findPage(
      buildOrgCertificateStatusesCriteria(
        { orgId, search: query.search, status: query.status },
        settings.mode,
        new Date(),
      ),
      { limit: query.limit, offset: query.offset },
    );
  }
}
