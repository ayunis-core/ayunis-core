export interface OtpauthUriParams {
  /** Account label shown in the authenticator app (typically the email). */
  label: string;
  /** Base32-encoded TOTP secret. */
  secret: string;
}

/**
 * TOTP primitive operations (secret generation, code verification, QR
 * rendering), abstracted so the library can be swapped and use cases can be
 * tested without real time-based codes.
 */
export abstract class TotpPort {
  /** Generates a new base32-encoded secret. */
  abstract generateSecret(): string;

  abstract buildOtpauthUri(params: OtpauthUriParams): string;

  /** Renders an otpauth:// URI as a PNG data URI for inline display. */
  abstract generateQrDataUri(otpauthUri: string): Promise<string>;

  /**
   * Verifies a code against a secret (with clock-skew tolerance). Returns the
   * matched TOTP time step for replay tracking, or null when invalid.
   */
  abstract verifyCode(secret: string, code: string): Promise<number | null>;
}
