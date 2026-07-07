import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateBudgetAlertNotificationsTable1783424474521 implements MigrationInterface {
    name = 'CreateBudgetAlertNotificationsTable1783424474521'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."budget_alert_notifications_scope_enum" AS ENUM('org', 'user', 'team')`);
        await queryRunner.query(`CREATE TABLE "budget_alert_notifications" ("id" character varying NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "orgId" character varying NOT NULL, "scope" "public"."budget_alert_notifications_scope_enum" NOT NULL, "targetId" uuid NOT NULL, "threshold" integer NOT NULL, "periodStart" TIMESTAMP WITH TIME ZONE NOT NULL, CONSTRAINT "PK_b632b9e33f52b5d4cc43ae882b0" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_6337725d67d28c6a7f7ab5e342" ON "budget_alert_notifications" ("orgId", "scope", "targetId", "periodStart", "threshold") `);
        await queryRunner.query(`ALTER TABLE "budget_alert_notifications" ADD CONSTRAINT "FK_f6fc7a751b95e204fa9b07dee97" FOREIGN KEY ("orgId") REFERENCES "orgs"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "budget_alert_notifications" DROP CONSTRAINT "FK_f6fc7a751b95e204fa9b07dee97"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_6337725d67d28c6a7f7ab5e342"`);
        await queryRunner.query(`DROP TABLE "budget_alert_notifications"`);
        await queryRunner.query(`DROP TYPE "public"."budget_alert_notifications_scope_enum"`);
    }

}
