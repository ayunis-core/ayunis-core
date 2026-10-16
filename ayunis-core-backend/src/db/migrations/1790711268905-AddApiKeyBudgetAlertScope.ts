import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddApiKeyBudgetAlertScope1790711268905 implements MigrationInterface {
  name = 'AddApiKeyBudgetAlertScope1790711268905';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "budget_alert_notifications" DROP CONSTRAINT "CHK_budget_alert_notifications_target_columns"`,
    );
    await queryRunner.query(
      `ALTER TABLE "budget_alert_notifications" ADD "apiKeyId" character varying`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_587eb44a5ba38d859c422014d6" ON "budget_alert_notifications" ("orgId", "apiKeyId", "periodStart", "threshold") WHERE "apiKeyId" IS NOT NULL`,
    );
    await queryRunner.query(`ALTER TABLE "budget_alert_notifications" ADD CONSTRAINT "CHK_budget_alert_notifications_scope_targets" CHECK ((
    ("scope" = 'org' AND "userId" IS NULL AND "teamId" IS NULL AND "apiKeyId" IS NULL)
    OR
    ("scope" = 'user' AND "userId" IS NOT NULL AND "teamId" IS NULL AND "apiKeyId" IS NULL)
    OR
    ("scope" = 'team' AND "userId" IS NULL AND "teamId" IS NOT NULL AND "apiKeyId" IS NULL)
    OR
    ("scope" = 'api_key' AND "userId" IS NULL AND "teamId" IS NULL AND "apiKeyId" IS NOT NULL)
  ))`);
    await queryRunner.query(
      `ALTER TABLE "budget_alert_notifications" ADD CONSTRAINT "FK_54e9db3196f820f9c925b63a3fe" FOREIGN KEY ("apiKeyId") REFERENCES "api_keys"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop API key markers before restoring the old check constraint, which
    // only allows the org, user and team scopes and would abort the rollback.
    await queryRunner.query(
      `DELETE FROM "budget_alert_notifications" WHERE "scope" = 'api_key'`,
    );
    await queryRunner.query(
      `ALTER TABLE "budget_alert_notifications" DROP CONSTRAINT "FK_54e9db3196f820f9c925b63a3fe"`,
    );
    await queryRunner.query(
      `ALTER TABLE "budget_alert_notifications" DROP CONSTRAINT "CHK_budget_alert_notifications_scope_targets"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_587eb44a5ba38d859c422014d6"`,
    );
    await queryRunner.query(
      `ALTER TABLE "budget_alert_notifications" DROP COLUMN "apiKeyId"`,
    );
    await queryRunner.query(
      `ALTER TABLE "budget_alert_notifications" ADD CONSTRAINT "CHK_budget_alert_notifications_target_columns" CHECK (((((scope)::text = 'org'::text) AND ("userId" IS NULL) AND ("teamId" IS NULL)) OR (((scope)::text = 'user'::text) AND ("userId" IS NOT NULL) AND ("teamId" IS NULL)) OR (((scope)::text = 'team'::text) AND ("userId" IS NULL) AND ("teamId" IS NOT NULL))))`,
    );
  }
}
