import { Injectable, Logger } from '@nestjs/common';
import { HandleUnexpectedErrors } from 'src/common/decorators/handle-unexpected-errors.decorator';
import type { Paginated } from 'src/common/pagination/paginated.entity';
import { UnexpectedAcademyAccessError } from 'src/iam/academy-access/application/academy-access.errors';
import type { OrgCertificateStatus } from 'src/iam/academy-access/application/models/org-certificate-status';
import { OrgCertificateStatusesService } from 'src/iam/academy-access/application/services/org-certificate-statuses.service';
import { ListOrgCertificateStatusesQuery } from './list-org-certificate-statuses.query';

export type { OrgCertificateStatus } from 'src/iam/academy-access/application/models/org-certificate-status';

/**
 * One page and its filtered total from the organization reporting query.
 */
@Injectable()
export class ListOrgCertificateStatusesUseCase {
  private readonly logger = new Logger(ListOrgCertificateStatusesUseCase.name);

  constructor(
    private readonly statusesService: OrgCertificateStatusesService,
  ) {}

  @HandleUnexpectedErrors(UnexpectedAcademyAccessError)
  async execute(
    query: ListOrgCertificateStatusesQuery,
  ): Promise<Paginated<OrgCertificateStatus>> {
    this.logger.log(
      {
        orgId: query.orgId,
        status: query.status,
      },
      'Listing org certificate statuses',
    );

    return this.statusesService.findPage(
      { orgId: query.orgId, search: query.search, status: query.status },
      { limit: query.limit, offset: query.offset },
    );
  }
}
