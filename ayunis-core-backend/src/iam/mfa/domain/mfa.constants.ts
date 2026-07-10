/** Failed verification attempts before the user's MFA is temporarily locked. */
export const MAX_FAILED_ATTEMPTS = 5;

/** How long an MFA lock lasts after too many failed attempts. */
export const LOCK_DURATION_MS = 15 * 60 * 1000;

/** Number of single-use recovery codes issued on enrollment. */
export const RECOVERY_CODE_COUNT = 10;

/** TOTP verification window in periods each way (1 = ±30s clock skew). */
export const TOTP_WINDOW = 1;

/** Issuer shown in authenticator apps for enrolled accounts. */
export const TOTP_ISSUER = 'Ayunis Core';
