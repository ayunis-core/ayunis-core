import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Data cleanup for AYC-299: deleting a user failed to remove that user's
 * already-accepted invite, leaving an orphaned row behind. Because
 * `invites.email` carries a global UNIQUE constraint, the orphan blocked
 * re-inviting the same email (the insert hit the unique violation).
 *
 * The code path is fixed separately (delete-by-email now matches accepted
 * invites too), but rows orphaned before that fix still need clearing. This
 * deletes every accepted invite whose email no longer maps to a user —
 * i.e. invites left behind by a deleted user. Accepted invites for users
 * that still exist are untouched.
 *
 * This is a one-way data fix: `down()` cannot recreate deleted rows (and
 * doing so would re-introduce the bug), so it is intentionally a no-op.
 */
export class CleanupOrphanedAcceptedInvites1781707812150 implements MigrationInterface {
  name = 'CleanupOrphanedAcceptedInvites1781707812150';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DELETE FROM "invites" AS "i"
       WHERE "i"."acceptedAt" IS NOT NULL
         AND NOT EXISTS (
           SELECT 1 FROM "users" AS "u"
           WHERE LOWER("u"."email") = LOWER("i"."email")
         )`,
    );
  }

  public async down(): Promise<void> {
    // Irreversible data cleanup — orphaned rows cannot (and should not) be
    // recreated. Intentional no-op.
  }
}
