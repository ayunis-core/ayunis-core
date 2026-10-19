import type { UUID } from 'crypto';
import type { CertificateValidityStatus } from 'src/iam/academy-access/domain/value-objects/certificate-validity-status.enum';

export class ExportOrgCertificateStatusesQuery {
  public readonly orgId: UUID;
  public readonly search?: string;
  public readonly status?: CertificateValidityStatus;

  constructor(params: {
    orgId: UUID;
    search?: string;
    status?: CertificateValidityStatus;
  }) {
    this.orgId = params.orgId;
    this.search = params.search;
    this.status = params.status;
  }
}
