import type { MigrationInterface, QueryRunner } from 'typeorm';

export class DropArtifactThreadId1795349200356 implements MigrationInterface {
  name = 'DropArtifactThreadId1795349200356';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "artifacts" DROP CONSTRAINT "FK_551c174f02d20652f95ec0836f7"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_551c174f02d20652f95ec0836f"`,
    );
    await queryRunner.query(`ALTER TABLE "artifacts" DROP COLUMN "threadId"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "artifacts" ADD "threadId" character varying`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_551c174f02d20652f95ec0836f" ON "artifacts" ("threadId") `,
    );
    await queryRunner.query(
      `ALTER TABLE "artifacts" ADD CONSTRAINT "FK_551c174f02d20652f95ec0836f7" FOREIGN KEY ("threadId") REFERENCES "threads"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }
}
