import { createHash } from 'crypto';

/**
 * Returns the hex-encoded SHA-256 digest of the input.
 *
 * Used to store high-entropy opaque tokens (e.g. password-set tokens) at rest:
 * a fast digest is safe here because the token carries ~256 bits of entropy, and
 * a plain digest (unlike bcrypt) allows an indexed O(1) lookup by hash. Never
 * use this for low-entropy secrets such as user passwords — those must be hashed
 * with bcrypt via the hashing module.
 */
export function sha256Hex(input: string): string {
  return createHash('sha256').update(input).digest('hex');
}
