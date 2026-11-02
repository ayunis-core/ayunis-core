import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateSubscriptionSync1793563311380 implements MigrationInterface {
  name = 'CreateSubscriptionSync1793563311380';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "subscription_sync_revisions" ("orgId" character varying NOT NULL, "revision" uuid NOT NULL, CONSTRAINT "PK_08ddab633f692cc3b0d4c326f9c" PRIMARY KEY ("orgId"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "subscription_sync_outbox" ("id" uuid NOT NULL, "orgId" character varying NOT NULL, "sequence" BIGSERIAL NOT NULL, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "claimToken" uuid, "eventName" character varying NOT NULL, "payload" bytea NOT NULL, "availableAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "UQ_e5438a7dfeec823f973678b2a08" UNIQUE ("sequence"), CONSTRAINT "PK_47496a5d6a64152fb6478bba6d9" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_9bdc4e45c59a3420665a59e2be" ON "subscription_sync_outbox" ("orgId", "sequence") `,
    );
    await queryRunner.query(
      `CREATE TABLE "subscription_sync_links" ("orgId" character varying NOT NULL, "ownerId" character varying NOT NULL, CONSTRAINT "PK_e93cae0cf403064eb722cdde45b" PRIMARY KEY ("orgId"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_cedd327b50c43dbd678f13aa94" ON "subscription_sync_links" ("ownerId") `,
    );
    await queryRunner.query(
      `CREATE TABLE "subscription_sync_leases" ("name" character varying NOT NULL, "ownerId" uuid NOT NULL, "expiresAt" TIMESTAMP WITH TIME ZONE NOT NULL, CONSTRAINT "PK_f3f518ecadcba25cf13228adf41" PRIMARY KEY ("name"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "subscription_sync_revisions" ADD CONSTRAINT "FK_08ddab633f692cc3b0d4c326f9c" FOREIGN KEY ("orgId") REFERENCES "orgs"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "subscription_sync_links" ADD CONSTRAINT "FK_e93cae0cf403064eb722cdde45b" FOREIGN KEY ("orgId") REFERENCES "orgs"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "subscription_sync_links" DROP CONSTRAINT "FK_e93cae0cf403064eb722cdde45b"`,
    );
    await queryRunner.query(
      `ALTER TABLE "subscription_sync_revisions" DROP CONSTRAINT "FK_08ddab633f692cc3b0d4c326f9c"`,
    );
    await queryRunner.query(`DROP TABLE "subscription_sync_leases"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_cedd327b50c43dbd678f13aa94"`,
    );
    await queryRunner.query(`DROP TABLE "subscription_sync_links"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_9bdc4e45c59a3420665a59e2be"`,
    );
    await queryRunner.query(`DROP TABLE "subscription_sync_outbox"`);
    await queryRunner.query(`DROP TABLE "subscription_sync_revisions"`);
  }
}
