import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Release notes were one notification per user. Their read state and the
 * chats started about them move to the release note itself, then the
 * notifications go, so the next migration can drop the `release_note` type.
 * A note without notifications was old news at the first sync and stays
 * unannounced. A read mark a user already made on the product updates page
 * is kept.
 */
export class MoveReleaseNoteStateOutOfNotifications1795102775534 implements MigrationInterface {
  name = 'MoveReleaseNoteStateOutOfNotifications1795102775534';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE "release_notes" rn
      SET "announced" = true
      WHERE EXISTS (
        SELECT 1 FROM "notifications" n WHERE n."releaseNoteId" = rn."id"
      )
    `);
    await queryRunner.query(`
      INSERT INTO "release_note_reads" ("id", "userId", "releaseNoteId", "createdAt", "updatedAt")
      SELECT gen_random_uuid()::text, n."userId", n."releaseNoteId", MIN(n."readAt"), MIN(n."readAt")
      FROM "notifications" n
      WHERE n."releaseNoteId" IS NOT NULL AND n."readAt" IS NOT NULL
      GROUP BY n."userId", n."releaseNoteId"
      ON CONFLICT ("userId", "releaseNoteId") DO NOTHING
    `);
    await queryRunner.query(`
      UPDATE "threads" t
      SET "sourceReleaseNoteId" = n."releaseNoteId", "sourceNotificationId" = NULL
      FROM "notifications" n
      WHERE n."id" = t."sourceNotificationId" AND n."releaseNoteId" IS NOT NULL
    `);
    await queryRunner.query(
      `DELETE FROM "notifications" WHERE "type" = 'release_note'`,
    );
  }

  public async down(): Promise<void> {
    // The deleted notifications cannot be restored: which users had one is
    // not kept. The schema migrations around this one revert cleanly.
  }
}
