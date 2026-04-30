import type { UUID } from 'crypto';

/**
 * Identity of the entity charged for a quota row. A user-anchored quota and
 * an api-key-anchored quota are separate buckets — even when the same human
 * created the api-key. Mirrors the principal split in
 * `iam/authentication/domain/active-principal.entity.ts` but stripped of
 * authorization fields the quota module doesn't need.
 */
export type PrincipalRef =
  | { kind: 'user'; userId: UUID }
  | { kind: 'apiKey'; apiKeyId: UUID };
