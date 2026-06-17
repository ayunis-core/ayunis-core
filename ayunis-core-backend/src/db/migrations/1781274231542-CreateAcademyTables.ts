import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateAcademyTables1781274231542 implements MigrationInterface {
  name = 'CreateAcademyTables1781274231542';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "academy_chapters" ("id" character varying NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "title" character varying NOT NULL, "description" text NOT NULL, "position" integer NOT NULL, CONSTRAINT "PK_95a85d6d36700f8bc6c16e3d22d" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "academy_lessons" ("id" character varying NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "chapterId" character varying NOT NULL, "title" character varying NOT NULL, "description" text, "loomUrl" character varying NOT NULL, "position" integer NOT NULL, CONSTRAINT "PK_473048a74027e35086529d18488" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_53d374c31fe02d9a59daf7392d" ON "academy_lessons" ("chapterId") `,
    );
    await queryRunner.query(
      `ALTER TABLE "academy_lessons" ADD CONSTRAINT "FK_53d374c31fe02d9a59daf7392d4" FOREIGN KEY ("chapterId") REFERENCES "academy_chapters"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "academy_lessons" DROP CONSTRAINT "FK_53d374c31fe02d9a59daf7392d4"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_53d374c31fe02d9a59daf7392d"`,
    );
    await queryRunner.query(`DROP TABLE "academy_lessons"`);
    await queryRunner.query(`DROP TABLE "academy_chapters"`);
  }
}
