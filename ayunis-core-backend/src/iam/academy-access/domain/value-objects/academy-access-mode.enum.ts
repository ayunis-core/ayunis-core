/**
 * How strictly an org ties chat access to the KI-Schulung nach EU AI Act certificate.
 * The catalogue is fixed at these three by the product requirement.
 */
export enum AcademyAccessMode {
  /** Chat is usable without a certificate. Default, and the pre-gate behaviour. */
  UNRESTRICTED = 'unrestricted',
  /** The certificate must be earned once; the pass never expires. */
  REQUIRED_ONCE = 'required_once',
  /** The certificate must be renewed every 12 months. */
  REQUIRED_ANNUALLY = 'required_annually',
}
