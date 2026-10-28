/**
 * How a single member's certificate stands, as shown in the admin overview.
 * `EXPIRING_SOON` and `EXPIRED` can only occur where the org requires annual
 * renewal — a permanent pass never lapses.
 */
export enum CertificateValidityStatus {
  NOT_PASSED = 'not_passed',
  VALID = 'valid',
  EXPIRING_SOON = 'expiring_soon',
  EXPIRED = 'expired',
}
