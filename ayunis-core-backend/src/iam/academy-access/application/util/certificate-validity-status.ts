import { CertificateValidityStatus } from 'src/iam/academy-access/domain/value-objects/certificate-validity-status.enum';

/**
 * How long before expiry a certificate counts as "expiring soon" in the admin
 * overview. Matches the first user-facing expiry notification, so an admin sees
 * a member turn amber at the same moment that member is first nudged.
 */
export const EXPIRING_SOON_DAYS = 30;

/**
 * Sort weight for the overview's default order: the members an admin has to act
 * on come first, and "valid" — the state needing no attention — comes last.
 *
 * A `Record` over the enum rather than a switch, so adding a status is a
 * compile error here instead of an unranked row at runtime.
 */
export const CERTIFICATE_STATUS_URGENCY: Record<
  CertificateValidityStatus,
  number
> = {
  [CertificateValidityStatus.EXPIRED]: 0,
  [CertificateValidityStatus.EXPIRING_SOON]: 1,
  [CertificateValidityStatus.NOT_PASSED]: 2,
  [CertificateValidityStatus.VALID]: 3,
};
