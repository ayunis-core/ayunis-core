import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSubscriptionsBillingInfo1752477313039
  implements MigrationInterface
{
  name = 'AddSubscriptionsBillingInfo1752477313039';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "subscription_billing_infos" ("id" character varying NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "companyName" character varying NOT NULL, "subText" character varying, "street" character varying NOT NULL, "houseNumber" character varying NOT NULL, "postalCode" character varying NOT NULL, "city" character varying NOT NULL, "country" character varying NOT NULL, "vatNumber" character varying, "subscriptionId" character varying NOT NULL, CONSTRAINT "REL_6eb87ccdbaf98a408e428546ad" UNIQUE ("subscriptionId"), CONSTRAINT "PK_e62989fe670b911ba4765f96e5e" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "subscription_billing_infos" ADD CONSTRAINT "FK_6eb87ccdbaf98a408e428546ad2" FOREIGN KEY ("subscriptionId") REFERENCES "subscriptions"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "subscription_billing_infos" DROP CONSTRAINT "FK_6eb87ccdbaf98a408e428546ad2"`,
    );
    await queryRunner.query(`DROP TABLE "subscription_billing_infos"`);
  }
}
