import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSourceMetadataToSourceRecords1774290326817 implements MigrationInterface {
  name = 'AddSourceMetadataToSourceRecords1774290326817';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add new enum types
    await queryRunner.query(
      `CREATE TYPE "public"."sources_texttype_enum" AS ENUM('file', 'web')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."sources_filetype_enum" AS ENUM('pdf', 'docx', 'pptx', 'txt')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."sources_datatype_enum" AS ENUM('csv')`,
    );

    // Add columns to sources table
    await queryRunner.query(
      `ALTER TABLE "sources" ADD "textType" "public"."sources_texttype_enum"`,
    );
    await queryRunner.query(
      `ALTER TABLE "sources" ADD "fileType" "public"."sources_filetype_enum"`,
    );
    await queryRunner.query(
      `ALTER TABLE "sources" ADD "url" character varying`,
    );
    await queryRunner.query(
      `ALTER TABLE "sources" ADD "dataType" "public"."sources_datatype_enum"`,
    );

    // Backfill from text_source_details_record
    await queryRunner.query(`
      UPDATE sources s
      SET "textType" = d."textType"::"public"."sources_texttype_enum",
          "fileType" = CASE
            WHEN d."fileType" IS NOT NULL
            THEN d."fileType"::"public"."sources_filetype_enum"
            ELSE NULL
          END,
          "url" = d."url"
      FROM text_source_details_record d
      WHERE d."sourceId" = s.id
    `);

    // Backfill from data_source_details_record
    await queryRunner.query(`
      UPDATE sources s
      SET "dataType" = d."dataType"::"public"."sources_datatype_enum"
      FROM data_source_details_record d
      WHERE d."sourceId" = s.id
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "sources" DROP COLUMN "dataType"`);
    await queryRunner.query(`DROP TYPE "public"."sources_datatype_enum"`);
    await queryRunner.query(`ALTER TABLE "sources" DROP COLUMN "url"`);
    await queryRunner.query(`ALTER TABLE "sources" DROP COLUMN "fileType"`);
    await queryRunner.query(`DROP TYPE "public"."sources_filetype_enum"`);
    await queryRunner.query(`ALTER TABLE "sources" DROP COLUMN "textType"`);
    await queryRunner.query(`DROP TYPE "public"."sources_texttype_enum"`);
  }
}
