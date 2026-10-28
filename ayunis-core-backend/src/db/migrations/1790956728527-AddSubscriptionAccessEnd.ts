import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSubscriptionAccessEnd1790956728527 implements MigrationInterface {
  name = 'AddSubscriptionAccessEnd1790956728527';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "subscription_access_adjustments" ("id" character varying NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "subscriptionId" character varying NOT NULL, "orgId" character varying NOT NULL, "changedByUserId" character varying, "previousAccessEndsAt" TIMESTAMP, "accessEndsAt" TIMESTAMP NOT NULL, "reason" character varying(500) NOT NULL, CONSTRAINT "PK_9d5290a7511f9f3f5ae7df88550" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "subscriptions" ADD "accessEndsAt" TIMESTAMP`,
    );
    await queryRunner.query(
      `ALTER TABLE "subscription_access_adjustments" ADD CONSTRAINT "FK_48ae5a22140155598be27dd0d02" FOREIGN KEY ("subscriptionId") REFERENCES "subscriptions"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "subscription_access_adjustments" ADD CONSTRAINT "FK_b66bdce8407c20370a2ac7f487e" FOREIGN KEY ("orgId") REFERENCES "orgs"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "subscription_access_adjustments" ADD CONSTRAINT "FK_ec57936c3eaa63bcbe6be2e4890" FOREIGN KEY ("changedByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "subscription_access_adjustments" DROP CONSTRAINT "FK_ec57936c3eaa63bcbe6be2e4890"`,
    );
    await queryRunner.query(
      `ALTER TABLE "subscription_access_adjustments" DROP CONSTRAINT "FK_b66bdce8407c20370a2ac7f487e"`,
    );
    await queryRunner.query(
      `ALTER TABLE "subscription_access_adjustments" DROP CONSTRAINT "FK_48ae5a22140155598be27dd0d02"`,
    );
    await queryRunner.query(
      `ALTER TABLE "subscriptions" DROP COLUMN "accessEndsAt"`,
    );
    await queryRunner.query(`DROP TABLE "subscription_access_adjustments"`);
  }
}
