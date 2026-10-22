import { randomUUID } from 'crypto';
import { AcademyAccessMode } from 'src/iam/academy-access/domain/value-objects/academy-access-mode.enum';
import { CertificateValidityStatus } from 'src/iam/academy-access/domain/value-objects/certificate-validity-status.enum';
import { buildOrgCertificateStatusesCriteria } from './org-certificate-statuses-criteria';

const NOW = new Date('2025-03-30T12:00:00Z');

it('combines filters with annual validity and one supplied clock without mutating inputs', () => {
  const filter = Object.freeze({
    orgId: randomUUID(),
    search: 'anna',
    status: CertificateValidityStatus.EXPIRED,
  });
  expect(
    buildOrgCertificateStatusesCriteria(
      filter,
      AcademyAccessMode.REQUIRED_ANNUALLY,
      NOW,
    ),
  ).toEqual({
    ...filter,
    renewalRequired: true,
    validityMonths: 12,
    now: NOW,
    expiringSoonUntil: new Date('2025-04-29T12:00:00Z'),
  });
  expect(NOW.toISOString()).toBe('2025-03-30T12:00:00.000Z');
});

it.each([AcademyAccessMode.REQUIRED_ONCE, AcademyAccessMode.UNRESTRICTED])(
  'does not require renewal for %s',
  (mode) => {
    expect(
      buildOrgCertificateStatusesCriteria({ orgId: randomUUID() }, mode, NOW)
        .renewalRequired,
    ).toBe(false);
  },
);
