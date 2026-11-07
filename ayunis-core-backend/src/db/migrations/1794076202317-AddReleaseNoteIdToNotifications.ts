import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddReleaseNoteIdToNotifications1794076202317 implements MigrationInterface {
  name = 'AddReleaseNoteIdToNotifications1794076202317';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "notifications" ADD "releaseNoteId" character varying`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_d12d8af700755c283a9b11ebce" ON "notifications" ("releaseNoteId") `,
    );
    await queryRunner.query(
      `ALTER TABLE "notifications" ADD CONSTRAINT "FK_d12d8af700755c283a9b11ebce5" FOREIGN KEY ("releaseNoteId") REFERENCES "release_notes"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "notifications" DROP CONSTRAINT "FK_d12d8af700755c283a9b11ebce5"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_d12d8af700755c283a9b11ebce"`,
    );
    await queryRunner.query(
      `ALTER TABLE "notifications" DROP COLUMN "releaseNoteId"`,
    );
  }
}
