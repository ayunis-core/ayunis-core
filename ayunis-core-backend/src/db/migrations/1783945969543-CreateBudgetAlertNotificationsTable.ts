import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateBudgetAlertNotificationsTable1783945969543 implements MigrationInterface {
  name = 'CreateBudgetAlertNotificationsTable1783945969543';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TABLE "budget_alert_notifications" ("id" character varying NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "orgId" character varying NOT NULL, "threshold" integer NOT NULL, "periodStart" TIMESTAMP WITH TIME ZONE NOT NULL, "userId" character varying, "teamId" character varying, "scope" character varying NOT NULL, CONSTRAINT "CHK_budget_alert_notifications_target_columns" CHECK ((
    ("scope" = 'org' AND "userId" IS NULL AND "teamId" IS NULL)
    OR
    ("scope" = 'user' AND "userId" IS NOT NULL AND "teamId" IS NULL)
    OR
    ("scope" = 'team' AND "userId" IS NULL AND "teamId" IS NOT NULL)
  )), CONSTRAINT "PK_b632b9e33f52b5d4cc43ae882b0" PRIMARY KEY ("id"))`);
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_60923255fa3cbbf5f0f8b51a3e" ON "budget_alert_notifications" ("orgId", "periodStart", "threshold") WHERE "scope" = 'org'`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_b95efee41893d3deec1ab2c9ac" ON "budget_alert_notifications" ("orgId", "userId", "periodStart", "threshold") WHERE "userId" IS NOT NULL`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_60eca7ce340ad062e11e7ad3e6" ON "budget_alert_notifications" ("orgId", "teamId", "periodStart", "threshold") WHERE "teamId" IS NOT NULL`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_7d5729a556cf7bf5a5cefc665c" ON "budget_alert_notifications" ("scope") `,
    );
    await queryRunner.query(
      `ALTER TABLE "budget_alert_notifications" ADD CONSTRAINT "FK_f6fc7a751b95e204fa9b07dee97" FOREIGN KEY ("orgId") REFERENCES "orgs"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "budget_alert_notifications" ADD CONSTRAINT "FK_e1e8bb3ab9654188a5b56110d7d" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "budget_alert_notifications" ADD CONSTRAINT "FK_92adeba490e22d07435a7c95308" FOREIGN KEY ("teamId") REFERENCES "teams"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "budget_alert_notifications" DROP CONSTRAINT "FK_92adeba490e22d07435a7c95308"`,
    );
    await queryRunner.query(
      `ALTER TABLE "budget_alert_notifications" DROP CONSTRAINT "FK_e1e8bb3ab9654188a5b56110d7d"`,
    );
    await queryRunner.query(
      `ALTER TABLE "budget_alert_notifications" DROP CONSTRAINT "FK_f6fc7a751b95e204fa9b07dee97"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_7d5729a556cf7bf5a5cefc665c"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_60eca7ce340ad062e11e7ad3e6"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_b95efee41893d3deec1ab2c9ac"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_60923255fa3cbbf5f0f8b51a3e"`,
    );
    await queryRunner.query(`DROP TABLE "budget_alert_notifications"`);
  }
}
