import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddApiKeyAttribution1779367289418 implements MigrationInterface {
  name = 'AddApiKeyAttribution1779367289418';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "usage" ADD "apiKeyId" character varying`,
    );
    await queryRunner.query(
      `ALTER TABLE "usage" DROP CONSTRAINT "FK_91e198d9fab36eceba00b08f2b6"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_3b5f7176c00a59a347ac3d0eb5"`,
    );
    await queryRunner.query(
      `ALTER TABLE "usage" ALTER COLUMN "userId" DROP NOT NULL`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_66cdd82a1ffc35f8d78c35c99f" ON "usage" ("apiKeyId", "createdAt") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_3b5f7176c00a59a347ac3d0eb5" ON "usage" ("userId", "createdAt") `,
    );
    await queryRunner.query(
      `ALTER TABLE "usage" ADD CONSTRAINT "CHK_usage_principal_not_both" CHECK ("userId" IS NULL OR "apiKeyId" IS NULL)`,
    );
    await queryRunner.query(
      `ALTER TABLE "usage" ADD CONSTRAINT "FK_91e198d9fab36eceba00b08f2b6" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "usage" ADD CONSTRAINT "FK_82cc3e3b0ea240eec1df45598c8" FOREIGN KEY ("apiKeyId") REFERENCES "api_keys"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "usage" DROP CONSTRAINT "FK_82cc3e3b0ea240eec1df45598c8"`,
    );
    await queryRunner.query(
      `ALTER TABLE "usage" DROP CONSTRAINT "FK_91e198d9fab36eceba00b08f2b6"`,
    );
    await queryRunner.query(
      `ALTER TABLE "usage" DROP CONSTRAINT "CHK_usage_principal_not_both"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_3b5f7176c00a59a347ac3d0eb5"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_66cdd82a1ffc35f8d78c35c99f"`,
    );
    // Required: rows attributed to an api-key have userId NULL and would
    // violate the re-imposed NOT NULL constraint. Drop them first so the
    // ALTER below can succeed.
    await queryRunner.query(`DELETE FROM "usage" WHERE "userId" IS NULL`);
    await queryRunner.query(
      `ALTER TABLE "usage" ALTER COLUMN "userId" SET NOT NULL`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_3b5f7176c00a59a347ac3d0eb5" ON "usage" ("userId", "createdAt") `,
    );
    await queryRunner.query(
      `ALTER TABLE "usage" ADD CONSTRAINT "FK_91e198d9fab36eceba00b08f2b6" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(`ALTER TABLE "usage" DROP COLUMN "apiKeyId"`);
  }
}
