import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateAcademyModuleViewTimesTable1791970233100 implements MigrationInterface {
  name = 'CreateAcademyModuleViewTimesTable1791970233100';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "academy_module_view_times" ("id" character varying NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "userId" character varying NOT NULL, "courseModuleId" character varying NOT NULL, "visibleSeconds" double precision NOT NULL DEFAULT '0', "lastHeartbeatAt" TIMESTAMP WITH TIME ZONE NOT NULL, CONSTRAINT "UQ_7c4d56b81e439775539f9f678c9" UNIQUE ("userId", "courseModuleId"), CONSTRAINT "PK_374784759078ab46fde73c4e3d9" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_d524df94184af9f616f24923f7" ON "academy_module_view_times" ("courseModuleId") `,
    );
    await queryRunner.query(
      `ALTER TABLE "academy_module_view_times" ADD CONSTRAINT "FK_97df560e9100bfb3de650fdba9f" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "academy_module_view_times" ADD CONSTRAINT "FK_d524df94184af9f616f24923f7d" FOREIGN KEY ("courseModuleId") REFERENCES "academy_course_modules"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "academy_module_view_times" DROP CONSTRAINT "FK_d524df94184af9f616f24923f7d"`,
    );
    await queryRunner.query(
      `ALTER TABLE "academy_module_view_times" DROP CONSTRAINT "FK_97df560e9100bfb3de650fdba9f"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_d524df94184af9f616f24923f7"`,
    );
    await queryRunner.query(`DROP TABLE "academy_module_view_times"`);
  }
}
