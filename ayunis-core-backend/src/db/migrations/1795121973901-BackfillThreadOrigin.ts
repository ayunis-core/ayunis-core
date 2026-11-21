import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Gives routine threads and notification chats their origin before the next
 * migration drops `type`. A chat whose notification was already deleted has
 * no link left and stays a `chat`. A thread with both a routine and a
 * notification cannot have exactly one origin, so the migration refuses to
 * pick one.
 */
export class BackfillThreadOrigin1795121973901 implements MigrationInterface {
  name = 'BackfillThreadOrigin1795121973901';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const ambiguous = (await queryRunner.query(
      `SELECT "id" FROM "threads" WHERE ("type" = 'routine' OR "routineId" IS NOT NULL) AND "sourceNotificationId" IS NOT NULL ORDER BY "id" LIMIT 10`,
    )) as { id: string }[];
    if (ambiguous.length > 0) {
      throw new Error(
        `Threads with both a routine and a notification origin, resolve them before migrating: ${ambiguous.map((thread) => thread.id).join(', ')}`,
      );
    }
    await queryRunner.query(
      `UPDATE "threads" SET "origin" = 'routine' WHERE "type" = 'routine'`,
    );
    await queryRunner.query(
      `UPDATE "threads" SET "origin" = 'notification' WHERE "sourceNotificationId" IS NOT NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // The next migration's down() restores `type` as 'chat' for every thread.
    await queryRunner.query(
      `UPDATE "threads" SET "type" = 'routine' WHERE "origin" = 'routine'`,
    );
  }
}
