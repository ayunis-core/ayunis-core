import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateOrgAddonsTable1781266620302 implements MigrationInterface {
  name = 'CreateOrgAddonsTable1781266620302';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "org_addons" ("id" character varying NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "type" character varying NOT NULL, "orgId" character varying NOT NULL, CONSTRAINT "UQ_a953cb4c09b15312670c9b231f3" UNIQUE ("orgId", "type"), CONSTRAINT "PK_5dbfcf5b94594de8a2784e7f02c" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_fb23061601e379b2b95aef9040" ON "org_addons" ("orgId") `,
    );
    await queryRunner.query(
      `ALTER TABLE "org_addons" ADD CONSTRAINT "FK_fb23061601e379b2b95aef90408" FOREIGN KEY ("orgId") REFERENCES "orgs"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "org_addons" DROP CONSTRAINT "FK_fb23061601e379b2b95aef90408"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_fb23061601e379b2b95aef9040"`,
    );
    await queryRunner.query(`DROP TABLE "org_addons"`);
  }
}
