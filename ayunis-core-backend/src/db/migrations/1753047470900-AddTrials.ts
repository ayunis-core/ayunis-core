import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTrials1753047470900 implements MigrationInterface {
  name = 'AddTrials1753047470900';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "trials" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        "orgId" uuid NOT NULL,
        "messagesSent" integer NOT NULL DEFAULT '0',
        "maxMessages" integer NOT NULL,
        CONSTRAINT "PK_trials" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_trials_orgId" ON "trials" ("orgId")
    `);

    await queryRunner.query(`
      ALTER TABLE "trials" 
      ADD CONSTRAINT "FK_trials_orgId" 
      FOREIGN KEY ("orgId") REFERENCES "orgs"("id") 
      ON DELETE NO ACTION ON UPDATE NO ACTION
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "trials" DROP CONSTRAINT "FK_trials_orgId"`,
    );
    await queryRunner.query(`DROP INDEX "IDX_trials_orgId"`);
    await queryRunner.query(`DROP TABLE "trials"`);
  }
}
