import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateSkillTemplatesTable1772657109813
  implements MigrationInterface
{
  name = 'CreateSkillTemplatesTable1772657109813';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "skill_templates" ("id" character varying NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "name" character varying NOT NULL, "shortDescription" character varying NOT NULL, "instructions" text NOT NULL, "distributionMode" character varying NOT NULL, "isActive" boolean NOT NULL DEFAULT false, "defaultActive" boolean, "defaultPinned" boolean, CONSTRAINT "UQ_8c7147d8348fe8dd497b386eb40" UNIQUE ("name"), CONSTRAINT "PK_019dd6ccb411ca3d71d28d18da2" PRIMARY KEY ("id"))`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "skill_templates"`);
  }
}
