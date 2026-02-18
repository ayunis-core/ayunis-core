import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTrials1753115389540 implements MigrationInterface {
  name = 'AddTrials1753115389540';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "trials" ("id" character varying NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "orgId" character varying NOT NULL, "messagesSent" integer NOT NULL DEFAULT '0', "maxMessages" integer NOT NULL, CONSTRAINT "PK_afe5dc86ce7253d239c3dfea2d3" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_21266e62a69dbcfa54790ce00e" ON "trials" ("orgId") `,
    );
    await queryRunner.query(
      `ALTER TABLE "trials" ADD CONSTRAINT "FK_21266e62a69dbcfa54790ce00e7" FOREIGN KEY ("orgId") REFERENCES "orgs"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "trials" DROP CONSTRAINT "FK_21266e62a69dbcfa54790ce00e7"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_21266e62a69dbcfa54790ce00e"`,
    );
    await queryRunner.query(`DROP TABLE "trials"`);
  }
}
