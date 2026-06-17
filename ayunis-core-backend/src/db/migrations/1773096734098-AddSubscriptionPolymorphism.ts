import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSubscriptionPolymorphism1773096734098 implements MigrationInterface {
  name = 'AddSubscriptionPolymorphism1773096734098';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "subscriptions" ADD "monthlyCredits" numeric(16,2)`,
    );
    await queryRunner.query(
      `ALTER TABLE "subscriptions" ADD "type" character varying NOT NULL DEFAULT 'SEAT_BASED'`,
    );
    await queryRunner.query(
      `ALTER TABLE "subscriptions" ALTER COLUMN "type" DROP DEFAULT`,
    );
    await queryRunner.query(
      `ALTER TABLE "subscriptions" ALTER COLUMN "noOfSeats" DROP NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "subscriptions" ALTER COLUMN "pricePerSeat" DROP NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "subscriptions" ALTER COLUMN "renewalCycle" TYPE character varying USING "renewalCycle"::character varying`,
    );
    await queryRunner.query(
      `ALTER TABLE "subscriptions" ALTER COLUMN "renewalCycle" DROP NOT NULL`,
    );
    await queryRunner.query(
      `DROP TYPE IF EXISTS "public"."subscriptions_renewalcycle_enum"`,
    );
    await queryRunner.query(
      `ALTER TABLE "subscriptions" ALTER COLUMN "renewalCycleAnchor" DROP NOT NULL`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_7fc69c933b26749eee02d108bb" ON "subscriptions" ("type") `,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "public"."IDX_7fc69c933b26749eee02d108bb"`,
    );
    await queryRunner.query(
      `DELETE FROM "subscriptions" WHERE "type" = 'USAGE_BASED'`,
    );
    await queryRunner.query(
      `UPDATE "subscriptions" SET "renewalCycleAnchor" = NOW() WHERE "renewalCycleAnchor" IS NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "subscriptions" ALTER COLUMN "renewalCycleAnchor" SET NOT NULL`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."subscriptions_renewalcycle_enum" AS ENUM('monthly', 'yearly')`,
    );
    await queryRunner.query(
      `ALTER TABLE "subscriptions" ALTER COLUMN "renewalCycle" TYPE "public"."subscriptions_renewalcycle_enum" USING "renewalCycle"::"public"."subscriptions_renewalcycle_enum"`,
    );
    await queryRunner.query(
      `ALTER TABLE "subscriptions" ALTER COLUMN "renewalCycle" SET NOT NULL`,
    );
    await queryRunner.query(
      `UPDATE "subscriptions" SET "noOfSeats" = 1 WHERE "noOfSeats" IS NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "subscriptions" ALTER COLUMN "noOfSeats" SET NOT NULL`,
    );
    await queryRunner.query(
      `UPDATE "subscriptions" SET "pricePerSeat" = 0 WHERE "pricePerSeat" IS NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "subscriptions" ALTER COLUMN "pricePerSeat" SET NOT NULL`,
    );
    await queryRunner.query(`ALTER TABLE "subscriptions" DROP COLUMN "type"`);
    await queryRunner.query(
      `ALTER TABLE "subscriptions" DROP COLUMN "monthlyCredits"`,
    );
  }
}
