import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddDefaultActiveAndPinnedToSkillTemplates1772717984846 implements MigrationInterface {
  name = 'AddDefaultActiveAndPinnedToSkillTemplates1772717984846';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "skill_templates" ADD "defaultActive" boolean`,
    );
    await queryRunner.query(
      `ALTER TABLE "skill_templates" ADD "defaultPinned" boolean`,
    );
    await queryRunner.query(
      `UPDATE "skill_templates" SET "defaultActive" = false, "defaultPinned" = false WHERE "distributionMode" = 'pre_created_copy' AND "defaultActive" IS NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "skill_templates" ALTER COLUMN "distributionMode" TYPE character varying USING "distributionMode"::text`,
    );
    await queryRunner.query(
      `DROP TYPE IF EXISTS "public"."skill_templates_distributionmode_enum"`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."skill_templates_distributionmode_enum" AS ENUM('always_on', 'pre_created_copy')`,
    );
    await queryRunner.query(
      `ALTER TABLE "skill_templates" ALTER COLUMN "distributionMode" TYPE "public"."skill_templates_distributionmode_enum" USING "distributionMode"::"public"."skill_templates_distributionmode_enum"`,
    );
    await queryRunner.query(
      `ALTER TABLE "skill_templates" DROP COLUMN "defaultPinned"`,
    );
    await queryRunner.query(
      `ALTER TABLE "skill_templates" DROP COLUMN "defaultActive"`,
    );
  }
}
