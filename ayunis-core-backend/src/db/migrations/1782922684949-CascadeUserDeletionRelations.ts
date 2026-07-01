import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Adds ON DELETE CASCADE foreign keys from user-owned tables to `users(id)` so
 * that deleting a user removes all of its dependent data instead of leaving
 * orphaned rows behind (data-privacy compliance, AYC-382).
 *
 * Two extra steps are layered on top of the auto-generated schema diff:
 *
 * 1. `mcp_integration_user_configs.user_id` was declared as `uuid` while every
 *    other id column (including `users.id`) is `character varying`. A foreign
 *    key requires matching column types, so the column is converted in place
 *    with a `USING` cast — this preserves existing data (the auto-generated
 *    DROP/ADD COLUMN would have discarded it).
 *
 * 2. Existing orphaned rows (whose `userId` no longer points at a live user,
 *    a direct consequence of the previous non-cascading delete behaviour) are
 *    purged before each constraint is added — otherwise the ADD CONSTRAINT
 *    would fail on production databases that already contain such rows.
 *    Deleting orphaned threads cascades to their messages, artifacts and
 *    generated-image rows via the pre-existing thread foreign keys.
 */
export class CascadeUserDeletionRelations1782922684949 implements MigrationInterface {
  name = 'CascadeUserDeletionRelations1782922684949';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Align the mcp user config column type with users(id) without data loss.
    await queryRunner.query(
      `ALTER TABLE "mcp_integration_user_configs" DROP CONSTRAINT "UQ_d2b5a8f0850eeab6b6dfb4885e8"`,
    );
    await queryRunner.query(
      `ALTER TABLE "mcp_integration_user_configs" ALTER COLUMN "user_id" TYPE character varying USING "user_id"::text`,
    );
    await queryRunner.query(
      `ALTER TABLE "mcp_integration_user_configs" ADD CONSTRAINT "UQ_d2b5a8f0850eeab6b6dfb4885e8" UNIQUE ("integration_id", "user_id")`,
    );

    // 2. Purge pre-existing orphaned rows so the new FKs can be validated.
    await queryRunner.query(
      `DELETE FROM "threads" WHERE "userId" NOT IN (SELECT "id" FROM "users")`,
    );
    await queryRunner.query(
      `DELETE FROM "artifacts" WHERE "userId" NOT IN (SELECT "id" FROM "users")`,
    );
    await queryRunner.query(
      `DELETE FROM "knowledge_bases" WHERE "userId" NOT IN (SELECT "id" FROM "users")`,
    );
    await queryRunner.query(
      `DELETE FROM "user_default_models" WHERE "userId" NOT IN (SELECT "id" FROM "users")`,
    );
    await queryRunner.query(
      `DELETE FROM "user_system_prompts" WHERE "userId" NOT IN (SELECT "id" FROM "users")`,
    );
    await queryRunner.query(
      `DELETE FROM "mcp_integration_user_configs" WHERE "user_id" NOT IN (SELECT "id" FROM "users")`,
    );

    // 3. Add the cascading foreign keys.
    await queryRunner.query(
      `ALTER TABLE "knowledge_bases" ADD CONSTRAINT "FK_e7f0bbc4c652f1c9146114c1b46" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_default_models" ADD CONSTRAINT "FK_2068066be6ef39ebd1aba35256e" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "threads" ADD CONSTRAINT "FK_256dd2e4946d6768c5583caa072" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "mcp_integration_user_configs" ADD CONSTRAINT "FK_28fb10d1d2526fd490f83f156b9" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_system_prompts" ADD CONSTRAINT "FK_67a0210e4823f925cd8372505fd" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "artifacts" ADD CONSTRAINT "FK_2e3cf9c3366ecc0433c0af146cb" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "artifacts" DROP CONSTRAINT "FK_2e3cf9c3366ecc0433c0af146cb"`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_system_prompts" DROP CONSTRAINT "FK_67a0210e4823f925cd8372505fd"`,
    );
    await queryRunner.query(
      `ALTER TABLE "mcp_integration_user_configs" DROP CONSTRAINT "FK_28fb10d1d2526fd490f83f156b9"`,
    );
    await queryRunner.query(
      `ALTER TABLE "threads" DROP CONSTRAINT "FK_256dd2e4946d6768c5583caa072"`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_default_models" DROP CONSTRAINT "FK_2068066be6ef39ebd1aba35256e"`,
    );
    await queryRunner.query(
      `ALTER TABLE "knowledge_bases" DROP CONSTRAINT "FK_e7f0bbc4c652f1c9146114c1b46"`,
    );
    await queryRunner.query(
      `ALTER TABLE "mcp_integration_user_configs" DROP CONSTRAINT "UQ_d2b5a8f0850eeab6b6dfb4885e8"`,
    );
    await queryRunner.query(
      `ALTER TABLE "mcp_integration_user_configs" ALTER COLUMN "user_id" TYPE uuid USING "user_id"::uuid`,
    );
    await queryRunner.query(
      `ALTER TABLE "mcp_integration_user_configs" ADD CONSTRAINT "UQ_d2b5a8f0850eeab6b6dfb4885e8" UNIQUE ("integration_id", "user_id")`,
    );
  }
}
