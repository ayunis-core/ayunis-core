import type { UUID } from 'crypto';
import type { CertificateValidityStatus } from 'src/iam/academy-access/domain/value-objects/certificate-validity-status.enum';

export interface OrgCertificateStatus {
  readonly userId: UUID;
  readonly name: string;
  readonly email: string;
  readonly completedAt: Date | null;
  readonly expiresAt: Date | null;
  readonly status: CertificateValidityStatus;
}
