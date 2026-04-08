import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Final cleanup of the legacy single-bucket fair-use quota (AYC-109, step 11).
 *
 * - Deletes any leftover `FAIR_USE_MESSAGES` rows from `usage_quotas`. These
 *   were sliding-window message counters; losing them just resets affected
 *   users to a fresh window on their next request.
 * - Drops the legacy `FAIR_USE_MESSAGES` value from the
 *   `usage_quotas_quotatype_enum` Postgres enum. This closes out the
 *   intentional TS↔DB drift that was retained between batches 5 and 6 so
 *   that the row-delete above could reference the legacy literal.
 *
 * The down migration restores the enum value (structural reversal) but does
 * NOT recreate the deleted rows — they cannot be recreated meaningfully.
 */
export class RemoveLegacyFairUseMessagesQuotaType1775583877301 implements MigrationInterface {
  name = 'RemoveLegacyFairUseMessagesQuotaType1775583877301';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Delete legacy sliding-window counter rows. Must run before the
    //    enum value is dropped, otherwise the column type swap below would
    //    fail on the leftover values.
    await queryRunner.query(
      `DELETE FROM "usage_quotas" WHERE "quotaType" = 'FAIR_USE_MESSAGES'`,
    );

    // 2. Drop the unique constraint and supporting index temporarily so we
    //    can swap the column type to the trimmed enum without losing data.
    await queryRunner.query(
      `ALTER TABLE "usage_quotas" DROP CONSTRAINT "UQ_394fe814ce4a600f6a083111998"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_394fe814ce4a600f6a08311199"`,
    );

    // 3. Rename old enum, create new enum without `FAIR_USE_MESSAGES`,
    //    cast the column over, drop the old enum.
    await queryRunner.query(
      `ALTER TYPE "public"."usage_quotas_quotatype_enum" RENAME TO "usage_quotas_quotatype_enum_old"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."usage_quotas_quotatype_enum" AS ENUM('FAIR_USE_MESSAGES_LOW', 'FAIR_USE_MESSAGES_MEDIUM', 'FAIR_USE_MESSAGES_HIGH')`,
    );
    await queryRunner.query(
      `ALTER TABLE "usage_quotas" ALTER COLUMN "quotaType" TYPE "public"."usage_quotas_quotatype_enum" USING "quotaType"::"text"::"public"."usage_quotas_quotatype_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE "public"."usage_quotas_quotatype_enum_old"`,
    );

    // 4. Restore the index and unique constraint.
    await queryRunner.query(
      `CREATE INDEX "IDX_394fe814ce4a600f6a08311199" ON "usage_quotas" ("userId", "quotaType")`,
    );
    await queryRunner.query(
      `ALTER TABLE "usage_quotas" ADD CONSTRAINT "UQ_394fe814ce4a600f6a083111998" UNIQUE ("userId", "quotaType")`,
    );
  }

  /**
   * Structural reversal of the enum change. The deleted rows are NOT
   * recreated — fair-use counter rows are sliding-window state, so losing
   * them in a rollback simply resets affected users to a fresh window on
   * their next request and no long-term data is destroyed.
   *
   * **Deep-rollback chain note:** To fully revert past batch 5
   * (`1775577907962-AddTieredFairUseQuotaTypes`), you must first
   * `DELETE FROM usage_quotas WHERE "quotaType" LIKE 'FAIR_USE_MESSAGES_%'`
   * — batch 5's `down()` casts to a 1-value enum that does not contain
   * the tiered values and would otherwise throw with
   * `invalid input value for enum "...enum_old": "FAIR_USE_MESSAGES_LOW"`.
   * Losing those rows is safe because they are sliding-window counters;
   * affected users will reset to a fresh window on their next request.
   */
  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "usage_quotas" DROP CONSTRAINT "UQ_394fe814ce4a600f6a083111998"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_394fe814ce4a600f6a08311199"`,
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
}
