import type { UUID } from 'crypto';
import type { Paginated } from 'src/common/pagination/paginated.entity';
import type { OrgCertificateStatus } from 'src/iam/academy-access/application/models/org-certificate-status';
import type { CertificateValidityStatus } from 'src/iam/academy-access/domain/value-objects/certificate-validity-status.enum';

export interface OrgCertificateStatusesFilter {
  orgId: UUID;
  search?: string;
  status?: CertificateValidityStatus;
}

export interface OrgCertificateStatusesCriteria extends OrgCertificateStatusesFilter {
  renewalRequired: boolean;
  validityMonths: number;
  now: Date;
  expiringSoonUntil: Date;
}

export interface OrgCertificateStatusesPage {
  limit: number;
  offset: number;
}

export abstract class OrgCertificateStatusesRepository {
  abstract findAll(
    criteria: OrgCertificateStatusesCriteria,
  ): Promise<OrgCertificateStatus[]>;
  abstract findPage(
    criteria: OrgCertificateStatusesCriteria,
    page: OrgCertificateStatusesPage,
  ): Promise<Paginated<OrgCertificateStatus>>;
}
