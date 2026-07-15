/**
 * Distinguishes the two flows that hand a user a password-set link. Both use the
 * same token store and the same redeem endpoint; only the expiry and the email
 * template differ.
 */
export enum PasswordSetTokenPurpose {
  /** Forgot-password / admin-triggered reset of an existing password. */
  RESET = 'reset',
  /** First-time password creation for a freshly provisioned account. */
  INITIAL = 'initial',
}
