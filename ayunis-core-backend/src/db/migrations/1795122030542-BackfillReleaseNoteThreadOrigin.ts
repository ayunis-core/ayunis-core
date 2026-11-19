import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Gives chats started from a product update (`sourceReleaseNoteId`, added on
 * main by AYC-1867) the `release_note` origin before the next migration only
 * allows that link on such threads. A chat moved off a deleted release-note
 * notification keeps no notification link, so it becomes a release-note chat
 * even if it was already a `notification` thread. A thread that still has a
 * routine or notification link cannot have exactly one origin, so the
 * migration refuses to pick one.
 */
export class BackfillReleaseNoteThreadOrigin1795122030542 implements MigrationInterface {
  name = 'BackfillReleaseNoteThreadOrigin1795122030542';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const ambiguous = (await queryRunner.query(
      `SELECT "id" FROM "threads" WHERE "sourceReleaseNoteId" IS NOT NULL AND ("routineId" IS NOT NULL OR "sourceNotificationId" IS NOT NULL OR "origin" = 'routine') ORDER BY "id" LIMIT 10`,
    )) as { id: string }[];
    if (ambiguous.length > 0) {
      throw new Error(
        `Threads with a release note and another origin, resolve them before migrating: ${ambiguous.map((thread) => thread.id).join(', ')}`,
      );
    }
    await queryRunner.query(
      `UPDATE "threads" SET "origin" = 'release_note' WHERE "sourceReleaseNoteId" IS NOT NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // The previous migration's down() drops the release_note kind; the link
    // in sourceReleaseNoteId stays, as it was before.
    await queryRunner.query(
      `UPDATE "threads" SET "origin" = 'chat' WHERE "origin" = 'release_note'`,
    );
  }
}
