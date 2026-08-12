import { CertificateValidityStatus } from 'src/iam/academy-access/domain/value-objects/certificate-validity-status.enum';
import {
  EXPIRING_SOON_DAYS,
  CERTIFICATE_STATUS_URGENCY,
  resolveCertificateValidityStatus,
} from './certificate-validity-status';

describe('resolveCertificateValidityStatus', () => {
  const now = new Date('2026-06-01T12:00:00.000Z');
  const DAY_MS = 24 * 60 * 60 * 1000;

  function statusOf(completedAt: Date | null, expiresAt: Date | null) {
    return resolveCertificateValidityStatus({ completedAt, expiresAt, now });
  }

  it('reports a user who never completed the academy as not passed', () => {
    expect(statusOf(null, null)).toBe(CertificateValidityStatus.NOT_PASSED);
  });

  // Orgs on `required_once` (and unrestricted ones) get a null expiry, and a
  // permanent pass must never read as lapsed however old it is.
  it('reports a pass without an expiry as valid', () => {
    const longAgo = new Date(now.getTime() - 5000 * DAY_MS);

    expect(statusOf(longAgo, null)).toBe(CertificateValidityStatus.VALID);
  });

  it('reports a pass expiring beyond the warning window as valid', () => {
    const expiresAt = new Date(
      now.getTime() + (EXPIRING_SOON_DAYS + 1) * DAY_MS,
    );

    expect(statusOf(now, expiresAt)).toBe(CertificateValidityStatus.VALID);
  });

  it('reports a pass expiring inside the warning window as expiring soon', () => {
    const expiresAt = new Date(
      now.getTime() + (EXPIRING_SOON_DAYS - 1) * DAY_MS,
    );

    expect(statusOf(now, expiresAt)).toBe(
      CertificateValidityStatus.EXPIRING_SOON,
    );
  });

  it('treats the warning window boundary as expiring soon', () => {
    const expiresAt = new Date(now.getTime() + EXPIRING_SOON_DAYS * DAY_MS);

    expect(statusOf(now, expiresAt)).toBe(
      CertificateValidityStatus.EXPIRING_SOON,
    );
  });

  it('reports a lapsed pass as expired', () => {
    const expiresAt = new Date(now.getTime() - DAY_MS);

    expect(statusOf(now, expiresAt)).toBe(CertificateValidityStatus.EXPIRED);
  });

  // The gate itself denies access the instant the expiry timestamp passes, so
  // the overview must not still show that member as holding a valid pass.
  it('treats the expiry moment itself as expired', () => {
    expect(statusOf(now, now)).toBe(CertificateValidityStatus.EXPIRED);
  });
});

describe('CERTIFICATE_STATUS_URGENCY', () => {
  it('orders the statuses an admin has to act on first', () => {
    const sorted = [
      CertificateValidityStatus.VALID,
      CertificateValidityStatus.NOT_PASSED,
      CertificateValidityStatus.EXPIRED,
      CertificateValidityStatus.EXPIRING_SOON,
    ].sort(
      (a, b) => CERTIFICATE_STATUS_URGENCY[a] - CERTIFICATE_STATUS_URGENCY[b],
    );

    expect(sorted).toEqual([
      CertificateValidityStatus.EXPIRED,
      CertificateValidityStatus.EXPIRING_SOON,
      CertificateValidityStatus.NOT_PASSED,
      CertificateValidityStatus.VALID,
    ]);
  });
});
