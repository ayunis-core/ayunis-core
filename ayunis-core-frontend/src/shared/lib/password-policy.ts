import { z } from 'zod';

/**
 * Password policy enforced by the backend
 * (see backend `LocalUsersRepository.isValidPassword`):
 * at least 8 characters, one uppercase letter, one lowercase letter, one digit.
 *
 * Keep this in sync with the backend check so client-side validation matches
 * what the server accepts.
 */
export function isValidPasswordPolicy(value: string): boolean {
  return (
    value.length >= 8 &&
    /[A-Z]/.test(value) &&
    /[a-z]/.test(value) &&
    /\d/.test(value)
  );
}

/**
 * Zod schema for a password field that must satisfy the full policy.
 * A single refine with a single message lists all rules at once.
 */
export function passwordPolicySchema(message: string) {
  return z.string().refine(isValidPasswordPolicy, { message });
}
