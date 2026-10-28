import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddEmlToFileTypeEnum1786548904033 implements MigrationInterface {
  name = 'AddEmlToFileTypeEnum1786548904033';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TYPE "public"."sources_filetype_enum" RENAME TO "sources_filetype_enum_old"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."sources_filetype_enum" AS ENUM('pdf', 'docx', 'pptx', 'txt', 'eml', 'audio')`,
    );
    await queryRunner.query(
      `ALTER TABLE "sources" ALTER COLUMN "fileType" TYPE "public"."sources_filetype_enum" USING "fileType"::"text"::"public"."sources_filetype_enum"`,
    );
    await queryRunner.query(`DROP TYPE "public"."sources_filetype_enum_old"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."sources_filetype_enum_old" AS ENUM('pdf', 'docx', 'pptx', 'txt', 'audio')`,
    );
    await queryRunner.query(
      `ALTER TABLE "sources" ALTER COLUMN "fileType" TYPE "public"."sources_filetype_enum_old" USING "fileType"::"text"::"public"."sources_filetype_enum_old"`,
    );
    await queryRunner.query(`DROP TYPE "public"."sources_filetype_enum"`);
    await queryRunner.query(
      `ALTER TYPE "public"."sources_filetype_enum_old" RENAME TO "sources_filetype_enum"`,
    );
  }
}
