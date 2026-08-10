import {
  AcademyAccessMode,
  CertificateValidityStatus,
} from '@/shared/api/generated/ayunisCoreAPI.schemas';

export interface CertificateStatusOption {
  value: CertificateValidityStatus;
  labelKey: string;
}

/** Ordered as the filter presents them: healthy first, then increasingly overdue. */
export const CERTIFICATE_STATUS_OPTIONS: readonly CertificateStatusOption[] = [
  {
    value: CertificateValidityStatus.valid,
    labelKey: 'overview.status.valid',
  },
  {
    value: CertificateValidityStatus.expiring_soon,
    labelKey: 'overview.status.expiringSoon',
  },
  {
    value: CertificateValidityStatus.expired,
    labelKey: 'overview.status.expired',
  },
  {
    value: CertificateValidityStatus.not_passed,
    labelKey: 'overview.status.notPassed',
  },
];

export const CERTIFICATE_STATUS_LABEL_KEYS: Record<
  CertificateValidityStatus,
  string
> = Object.fromEntries(
  CERTIFICATE_STATUS_OPTIONS.map((option) => [option.value, option.labelKey]),
) as Record<CertificateValidityStatus, string>;

export const ALL_STATUSES_FILTER_VALUE = 'all';

/**
 * States the backend can only ever produce for an org that renews annually: a
 * permanent pass never lapses, so it is neither expiring nor expired.
 */
const ANNUAL_ONLY_STATUSES: readonly CertificateValidityStatus[] = [
  CertificateValidityStatus.expiring_soon,
  CertificateValidityStatus.expired,
];

/** Whether filtering by `status` can match anything in the given mode. */
export function isStatusReachable(
  status: CertificateValidityStatus | undefined,
  mode: AcademyAccessMode,
): boolean {
  if (status === undefined) {
    return true;
  }
  return (
    mode === AcademyAccessMode.required_annually ||
    !ANNUAL_ONLY_STATUSES.includes(status)
  );
}

/** The filter options worth offering in the given mode. */
export function certificateStatusOptions(
  mode: AcademyAccessMode,
): readonly CertificateStatusOption[] {
  return CERTIFICATE_STATUS_OPTIONS.filter((option) =>
    isStatusReachable(option.value, mode),
  );
}
