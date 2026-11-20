import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSourceReleaseNoteToThreads1795102401122 implements MigrationInterface {
  name = 'AddSourceReleaseNoteToThreads1795102401122';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "threads" ADD "sourceReleaseNoteId" character varying`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_c301b7d92e36a020f21f3b3529" ON "threads" ("sourceReleaseNoteId") `,
    );
    await queryRunner.query(
      `ALTER TABLE "threads" ADD CONSTRAINT "FK_c301b7d92e36a020f21f3b35294" FOREIGN KEY ("sourceReleaseNoteId") REFERENCES "release_notes"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "threads" DROP CONSTRAINT "FK_c301b7d92e36a020f21f3b35294"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_c301b7d92e36a020f21f3b3529"`,
    );
    await queryRunner.query(
      `ALTER TABLE "threads" DROP COLUMN "sourceReleaseNoteId"`,
    );
  }
}
