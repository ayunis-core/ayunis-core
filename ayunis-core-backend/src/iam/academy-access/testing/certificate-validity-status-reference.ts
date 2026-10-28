import { CertificateValidityStatus } from 'src/iam/academy-access/domain/value-objects/certificate-validity-status.enum';
import { EXPIRING_SOON_DAYS } from 'src/iam/academy-access/application/util/certificate-validity-status';

const DAY_MS = 24 * 60 * 60 * 1000;

export interface CertificateValidityInput {
  completedAt: Date | null;
  /** Null whenever the org does not require renewal — a permanent pass has no expiry. */
  expiresAt: Date | null;
  now: Date;
}

export function resolveCertificateValidityStatus({
  completedAt,
  expiresAt,
  now,
}: CertificateValidityInput): CertificateValidityStatus {
  if (completedAt === null) {
    return CertificateValidityStatus.NOT_PASSED;
  }
  if (expiresAt === null) {
    return CertificateValidityStatus.VALID;
  }

  const msUntilExpiry = expiresAt.getTime() - now.getTime();
  if (msUntilExpiry <= 0) {
    return CertificateValidityStatus.EXPIRED;
  }
  if (msUntilExpiry <= EXPIRING_SOON_DAYS * DAY_MS) {
    return CertificateValidityStatus.EXPIRING_SOON;
  }
  return CertificateValidityStatus.VALID;
}
