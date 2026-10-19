import { Injectable } from '@nestjs/common';
import type { Paginated } from 'src/common/pagination/paginated.entity';
import { ACADEMY_COMPLETION_VALIDITY_MONTHS } from 'src/domain/academy/application/util/certificate-validity';
import type { OrgCertificateStatus } from 'src/iam/academy-access/application/models/org-certificate-status';
import {
  OrgCertificateStatusesRepository,
  type OrgCertificateStatusesCriteria,
  type OrgCertificateStatusesFilter,
  type OrgCertificateStatusesPage,
} from 'src/iam/academy-access/application/ports/org-certificate-statuses.repository';
import { AcademyAccessMode } from 'src/iam/academy-access/domain/value-objects/academy-access-mode.enum';
import { EXPIRING_SOON_DAYS } from 'src/iam/academy-access/application/util/certificate-validity-status';
import { GetOrgAcademyAccessSettingsUseCase } from 'src/iam/academy-access/application/use-cases/get-org-academy-access-settings/get-org-academy-access-settings.use-case';
import { GetOrgAcademyAccessSettingsQuery } from 'src/iam/academy-access/application/use-cases/get-org-academy-access-settings/get-org-academy-access-settings.query';

@Injectable()
export class OrgCertificateStatusesService {
  constructor(
    private readonly getOrgSettingsUseCase: GetOrgAcademyAccessSettingsUseCase,
    private readonly repository: OrgCertificateStatusesRepository,
  ) {}

  async findAll(
    filter: OrgCertificateStatusesFilter,
  ): Promise<OrgCertificateStatus[]> {
    return this.repository.findAll(await this.criteria(filter));
  }

  async findPage(
    filter: OrgCertificateStatusesFilter,
    page: OrgCertificateStatusesPage,
  ): Promise<Paginated<OrgCertificateStatus>> {
    return this.repository.findPage(await this.criteria(filter), page);
  }

  private async criteria(
    filter: OrgCertificateStatusesFilter,
  ): Promise<OrgCertificateStatusesCriteria> {
    const settings = await this.getOrgSettingsUseCase.execute(
      new GetOrgAcademyAccessSettingsQuery(filter.orgId),
    );
    const now = new Date();
    return {
      ...filter,
      renewalRequired: settings.mode === AcademyAccessMode.REQUIRED_ANNUALLY,
      validityMonths: ACADEMY_COMPLETION_VALIDITY_MONTHS,
      now,
      expiringSoonUntil: new Date(
        now.getTime() + EXPIRING_SOON_DAYS * 86400000,
      ),
    };
  }
}
