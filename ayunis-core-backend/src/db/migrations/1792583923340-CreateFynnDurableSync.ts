import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateFynnDurableSync1792583923340 implements MigrationInterface {
  name = 'CreateFynnDurableSync1792583923340';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "fynn_sync_revisions" ("orgId" character varying NOT NULL, "revision" uuid NOT NULL, CONSTRAINT "PK_b461d33b74bd3fde2cd7a093fbf" PRIMARY KEY ("orgId"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "fynn_outbox" ("id" uuid NOT NULL, "orgId" character varying NOT NULL, "sequence" BIGSERIAL NOT NULL, "eventName" character varying NOT NULL, "payload" bytea NOT NULL, "availableAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "UQ_7735f14c7b5b1b9595bd18f9b06" UNIQUE ("sequence"), CONSTRAINT "PK_28afdfeeca058afc57cd60a766f" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_150ec800d3bac60231c988e69a" ON "fynn_outbox" ("orgId", "sequence") `,
    );
    await queryRunner.query(
      `ALTER TABLE "fynn_sync_revisions" ADD CONSTRAINT "FK_b461d33b74bd3fde2cd7a093fbf" FOREIGN KEY ("orgId") REFERENCES "orgs"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "fynn_sync_revisions" DROP CONSTRAINT "FK_b461d33b74bd3fde2cd7a093fbf"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_150ec800d3bac60231c988e69a"`,
    );
    await queryRunner.query(`DROP TABLE "fynn_outbox"`);
    await queryRunner.query(`DROP TABLE "fynn_sync_revisions"`);
  }
}
