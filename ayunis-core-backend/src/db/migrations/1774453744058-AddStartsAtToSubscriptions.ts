import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddStartsAtToSubscriptions1774453744058 implements MigrationInterface {
  name = 'AddStartsAtToSubscriptions1774453744058';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "subscriptions" ADD "startsAt" TIMESTAMP`,
    );
    await queryRunner.query(
      `UPDATE "subscriptions" SET "startsAt" = "createdAt" WHERE "startsAt" IS NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "subscriptions" ALTER COLUMN "startsAt" SET NOT NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "subscriptions" DROP COLUMN "startsAt"`,
    );
  }
}
