import type { CertificateValidityStatus } from 'src/iam/academy-access/domain/value-objects/certificate-validity-status.enum';

export class ExportOrgCertificateStatusesQuery {
  public readonly search?: string;
  public readonly status?: CertificateValidityStatus;

  constructor(params: { search?: string; status?: CertificateValidityStatus }) {
    this.search = params.search;
    this.status = params.status;
  }
}
