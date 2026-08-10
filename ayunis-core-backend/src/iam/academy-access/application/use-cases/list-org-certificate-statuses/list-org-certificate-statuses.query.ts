import type { UUID } from 'crypto';
import type { PaginatedQueryParams } from 'src/common/pagination/paginated.query';
import { PaginatedQuery } from 'src/common/pagination/paginated.query';
import type { CertificateValidityStatus } from 'src/iam/academy-access/domain/value-objects/certificate-validity-status.enum';

const DEFAULT_LIMIT = 25;

export interface ListOrgCertificateStatusesQueryParams {
  orgId: UUID;
  search?: string;
  status?: CertificateValidityStatus;
  pagination?: Partial<PaginatedQueryParams>;
}

export class ListOrgCertificateStatusesQuery extends PaginatedQuery {
  public readonly orgId: UUID;
  public readonly search?: string;
  public readonly status?: CertificateValidityStatus;

  constructor(params: ListOrgCertificateStatusesQueryParams) {
    super({
      limit: params.pagination?.limit ?? DEFAULT_LIMIT,
      offset: params.pagination?.offset ?? 0,
    });
    this.orgId = params.orgId;
    this.search = params.search;
    this.status = params.status;
  }
}
