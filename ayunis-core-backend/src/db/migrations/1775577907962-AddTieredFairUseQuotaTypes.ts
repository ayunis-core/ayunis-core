import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTieredFairUseQuotaTypes1775577907962 implements MigrationInterface {
  name = 'AddTieredFairUseQuotaTypes1775577907962';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Historical note: legacy `FAIR_USE_MESSAGES` is retained in the DB enum
    // here so the AYC-109 step-11 migration
    // (1775583877301-RemoveLegacyFairUseMessagesQuotaType) can DELETE the
    // legacy rows by literal comparison before dropping the enum value.
    // Drop the unique constraint and supporting index temporarily so we can
    // swap the column type to the new enum without dropping data.
    await queryRunner.query(
      `DROP INDEX "public"."IDX_394fe814ce4a600f6a08311199"`,
    );
    await queryRunner.query(
      `ALTER TABLE "usage_quotas" DROP CONSTRAINT "UQ_394fe814ce4a600f6a083111998"`,
    );
    await queryRunner.query(
      `ALTER TYPE "public"."usage_quotas_quotatype_enum" RENAME TO "usage_quotas_quotatype_enum_old"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."usage_quotas_quotatype_enum" AS ENUM('FAIR_USE_MESSAGES', 'FAIR_USE_MESSAGES_LOW', 'FAIR_USE_MESSAGES_MEDIUM', 'FAIR_USE_MESSAGES_HIGH')`,
    );
    await queryRunner.query(
      `ALTER TABLE "usage_quotas" ALTER COLUMN "quotaType" TYPE "public"."usage_quotas_quotatype_enum" USING "quotaType"::"text"::"public"."usage_quotas_quotatype_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE "public"."usage_quotas_quotatype_enum_old"`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_394fe814ce4a600f6a08311199" ON "usage_quotas" ("userId", "quotaType")`,
    );
    await queryRunner.query(
      `ALTER TABLE "usage_quotas" ADD CONSTRAINT "UQ_394fe814ce4a600f6a083111998" UNIQUE ("userId", "quotaType")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "usage_quotas" DROP CONSTRAINT "UQ_394fe814ce4a600f6a083111998"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_394fe814ce4a600f6a08311199"`,
    );
    // Drop tiered rows before recreating the legacy enum — the old enum only
    // contains 'FAIR_USE_MESSAGES', so any tiered values would fail the USING
    // cast with "invalid input value for enum" and abort the rollback.
    await queryRunner.query(
      `DELETE FROM "usage_quotas" WHERE "quotaType" IN ('FAIR_USE_MESSAGES_LOW', 'FAIR_USE_MESSAGES_MEDIUM', 'FAIR_USE_MESSAGES_HIGH')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."usage_quotas_quotatype_enum_old" AS ENUM('FAIR_USE_MESSAGES')`,
    );
    await queryRunner.query(
      `ALTER TABLE "usage_quotas" ALTER COLUMN "quotaType" TYPE "public"."usage_quotas_quotatype_enum_old" USING "quotaType"::"text"::"public"."usage_quotas_quotatype_enum_old"`,
    );
    await queryRunner.query(`DROP TYPE "public"."usage_quotas_quotatype_enum"`);
    await queryRunner.query(
      `ALTER TYPE "public"."usage_quotas_quotatype_enum_old" RENAME TO "usage_quotas_quotatype_enum"`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_394fe814ce4a600f6a08311199" ON "usage_quotas" ("userId", "quotaType")`,
    );
    await queryRunner.query(
      `ALTER TABLE "usage_quotas" ADD CONSTRAINT "UQ_394fe814ce4a600f6a083111998" UNIQUE ("userId", "quotaType")`,
    );
  }
}
