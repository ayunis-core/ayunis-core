import { randomBytes } from 'crypto';

/**
 * Crockford base32 alphabet (no I, L, O, U) — unambiguous when read or
 * typed from a printout.
 */
const ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
const GROUP_LENGTH = 5;

export const RECOVERY_CODE_PATTERN = /^[0-9A-Z]{5}-[0-9A-Z]{5}$/;

/** Generates a recovery code of the form XXXXX-XXXXX (50 bits of entropy). */
export function generateRecoveryCode(): string {
  const bytes = randomBytes(GROUP_LENGTH * 2);
  const chars = Array.from(bytes, (byte) => ALPHABET[byte % ALPHABET.length]);
  return `${chars.slice(0, GROUP_LENGTH).join('')}-${chars.slice(GROUP_LENGTH).join('')}`;
}
