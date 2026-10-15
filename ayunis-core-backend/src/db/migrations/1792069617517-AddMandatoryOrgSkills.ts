import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddMandatoryOrgSkills1792069617517 implements MigrationInterface {
  name = 'AddMandatoryOrgSkills1792069617517';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "skills" ADD "isMandatory" boolean NOT NULL DEFAULT false`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_skills_mandatory_org" ON "skills" ("orgId") WHERE "isMandatory" = true`,
    );
    await queryRunner.query(
      `ALTER TABLE "skills" ADD CONSTRAINT "CHK_skills_mandatory_org_only" CHECK ("isMandatory" = false OR ("orgId" IS NOT NULL AND "teamId" IS NULL))`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "skills" DROP CONSTRAINT "CHK_skills_mandatory_org_only"`,
    );
    await queryRunner.query(`DROP INDEX "public"."IDX_skills_mandatory_org"`);
    await queryRunner.query(`ALTER TABLE "skills" DROP COLUMN "isMandatory"`);
  }
}
