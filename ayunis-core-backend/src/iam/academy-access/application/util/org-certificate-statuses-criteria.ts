import { ACADEMY_COMPLETION_VALIDITY_MONTHS } from 'src/domain/academy/application/util/certificate-validity';
import type {
  OrgCertificateStatusesCriteria,
  OrgCertificateStatusesFilter,
} from 'src/iam/academy-access/application/ports/org-certificate-statuses.repository';
import { AcademyAccessMode } from 'src/iam/academy-access/domain/value-objects/academy-access-mode.enum';
import { EXPIRING_SOON_DAYS } from './certificate-validity-status';

export function buildOrgCertificateStatusesCriteria(
  filter: OrgCertificateStatusesFilter,
  mode: AcademyAccessMode,
  now: Date,
): OrgCertificateStatusesCriteria {
  return {
    ...filter,
    renewalRequired: mode === AcademyAccessMode.REQUIRED_ANNUALLY,
    validityMonths: ACADEMY_COMPLETION_VALIDITY_MONTHS,
    now,
    expiringSoonUntil: new Date(now.getTime() + EXPIRING_SOON_DAYS * 86400000),
  };
}
