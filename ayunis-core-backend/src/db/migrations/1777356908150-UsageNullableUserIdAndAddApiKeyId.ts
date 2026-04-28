import type { MigrationInterface, QueryRunner } from 'typeorm';

export class UsageNullableUserIdAndAddApiKeyId1777356908150 implements MigrationInterface {
  name = 'UsageNullableUserIdAndAddApiKeyId1777356908150';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "usage" ADD "apiKeyId" character varying`,
    );
    await queryRunner.query(
      `ALTER TABLE "usage" ALTER COLUMN "userId" DROP NOT NULL`,
    );
    // Switch userId FK from CASCADE to SET NULL so deleting a user preserves
    // their usage history; org-level reporting stays valid.
    await queryRunner.query(
      `ALTER TABLE "usage" DROP CONSTRAINT "FK_91e198d9fab36eceba00b08f2b6"`,
    );
    await queryRunner.query(
      `ALTER TABLE "usage" ADD CONSTRAINT "FK_91e198d9fab36eceba00b08f2b6" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "usage" ADD CONSTRAINT "FK_82cc3e3b0ea240eec1df45598c8" FOREIGN KEY ("apiKeyId") REFERENCES "api_keys"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_66cdd82a1ffc35f8d78c35c99f" ON "usage" ("apiKeyId", "createdAt")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "public"."IDX_66cdd82a1ffc35f8d78c35c99f"`,
    );
    await queryRunner.query(
      `ALTER TABLE "usage" DROP CONSTRAINT "FK_82cc3e3b0ea240eec1df45598c8"`,
    );
    await queryRunner.query(
      `ALTER TABLE "usage" DROP CONSTRAINT "FK_91e198d9fab36eceba00b08f2b6"`,
    );
    await queryRunner.query(
      `ALTER TABLE "usage" ADD CONSTRAINT "FK_91e198d9fab36eceba00b08f2b6" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    // DESTRUCTIVE: api-key-attributed usage rows (userId IS NULL) cannot
    // satisfy the restored NOT NULL constraint, so they are deleted before
    // it is reapplied. Reverting this migration permanently loses api-key
    // usage history.
    await queryRunner.query(`DELETE FROM "usage" WHERE "userId" IS NULL`);
    await queryRunner.query(
      `ALTER TABLE "usage" ALTER COLUMN "userId" SET NOT NULL`,
    );
    await queryRunner.query(`ALTER TABLE "usage" DROP COLUMN "apiKeyId"`);
  }
}
