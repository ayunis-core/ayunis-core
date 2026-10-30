import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateExternalSubscriptionLease1793397639540 implements MigrationInterface {
  name = 'CreateExternalSubscriptionLease1793397639540';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "external_subscription_leases" ("name" character varying NOT NULL, "ownerId" uuid NOT NULL, "expiresAt" TIMESTAMP WITH TIME ZONE NOT NULL, CONSTRAINT "PK_339ee47a2d1f3dda4788608f8e8" PRIMARY KEY ("name"))`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "external_subscription_leases"`);
  }
}
