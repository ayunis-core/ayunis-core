import type { UUID } from 'crypto';

/**
 * The identifying fields of a member, for listings that only label people.
 *
 * Deliberately not a `User`: reading it avoids loading password hashes and the
 * rest of the row for screens that show a name and an email. It lives in
 * `domain/` rather than beside the repository port because other modules read
 * it, and cross-module imports may not reach into another module's ports.
 */
export interface UserSummary {
  id: UUID;
  name: string;
  email: string;
}
