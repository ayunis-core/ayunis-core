import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateOrgAcademyAccessSettingsTable1785492658378 implements MigrationInterface {
  name = 'CreateOrgAcademyAccessSettingsTable1785492658378';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."org_academy_access_settings_mode_enum" AS ENUM('unrestricted', 'required_once', 'required_annually')`,
    );
    await queryRunner.query(
      `CREATE TABLE "org_academy_access_settings" ("id" character varying NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "orgId" character varying NOT NULL, "mode" "public"."org_academy_access_settings_mode_enum" NOT NULL DEFAULT 'unrestricted', CONSTRAINT "PK_975522dd723bc75ef8143c3d189" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_20ce40cacbf088c67928a1ef62" ON "org_academy_access_settings" ("orgId") `,
    );
    await queryRunner.query(
      `ALTER TABLE "org_academy_access_settings" ADD CONSTRAINT "FK_20ce40cacbf088c67928a1ef62d" FOREIGN KEY ("orgId") REFERENCES "orgs"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "org_academy_access_settings" DROP CONSTRAINT "FK_20ce40cacbf088c67928a1ef62d"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_20ce40cacbf088c67928a1ef62"`,
    );
    await queryRunner.query(`DROP TABLE "org_academy_access_settings"`);
    await queryRunner.query(
      `DROP TYPE "public"."org_academy_access_settings_mode_enum"`,
    );
  }
}
