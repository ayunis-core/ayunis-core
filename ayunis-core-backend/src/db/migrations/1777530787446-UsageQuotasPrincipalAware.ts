import type { MigrationInterface, QueryRunner } from 'typeorm';

export class UsageQuotasPrincipalAware1777530787446 implements MigrationInterface {
  name = 'UsageQuotasPrincipalAware1777530787446';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "public"."IDX_394fe814ce4a600f6a08311199"`,
    );
    await queryRunner.query(
      `ALTER TABLE "usage_quotas" DROP CONSTRAINT "UQ_394fe814ce4a600f6a083111998"`,
    );
    await queryRunner.query(
      `ALTER TABLE "usage_quotas" ADD "apiKeyId" character varying`,
    );
    await queryRunner.query(
      `ALTER TABLE "usage_quotas" DROP CONSTRAINT "FK_37d7c2fab0e43097c7035472533"`,
    );
    await queryRunner.query(
      `ALTER TABLE "usage_quotas" ALTER COLUMN "userId" DROP NOT NULL`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_usage_quotas_apikey_quota" ON "usage_quotas" ("apiKeyId", "quotaType") WHERE "userId" IS NULL`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_usage_quotas_user_quota" ON "usage_quotas" ("userId", "quotaType") WHERE "apiKeyId" IS NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "usage_quotas" ADD CONSTRAINT "CHK_usage_quotas_principal" CHECK (("userId" IS NULL) <> ("apiKeyId" IS NULL))`,
    );
    await queryRunner.query(
      `ALTER TABLE "usage_quotas" ADD CONSTRAINT "FK_37d7c2fab0e43097c7035472533" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "usage_quotas" ADD CONSTRAINT "FK_3f76e2a34d3bc934f1f16f6f4c7" FOREIGN KEY ("apiKeyId") REFERENCES "api_keys"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "usage_quotas" DROP CONSTRAINT "FK_3f76e2a34d3bc934f1f16f6f4c7"`,
    );
    await queryRunner.query(
      `ALTER TABLE "usage_quotas" DROP CONSTRAINT "FK_37d7c2fab0e43097c7035472533"`,
    );
    await queryRunner.query(
      `ALTER TABLE "usage_quotas" DROP CONSTRAINT "CHK_usage_quotas_principal"`,
    );
    await queryRunner.query(`DROP INDEX "public"."UQ_usage_quotas_user_quota"`);
    await queryRunner.query(
      `DROP INDEX "public"."UQ_usage_quotas_apikey_quota"`,
    );
    await queryRunner.query(
      `ALTER TABLE "usage_quotas" ALTER COLUMN "userId" SET NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "usage_quotas" ADD CONSTRAINT "FK_37d7c2fab0e43097c7035472533" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "usage_quotas" DROP COLUMN "apiKeyId"`,
    );
    await queryRunner.query(
      `ALTER TABLE "usage_quotas" ADD CONSTRAINT "UQ_394fe814ce4a600f6a083111998" UNIQUE ("userId", "quotaType")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_394fe814ce4a600f6a08311199" ON "usage_quotas" ("userId", "quotaType") `,
    );
  }
}
