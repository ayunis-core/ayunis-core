import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateReleaseNotesTable1794072121138 implements MigrationInterface {
  name = 'CreateReleaseNotesTable1794072121138';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."release_notes_mediatype_enum" AS ENUM('image', 'loom')`,
    );
    await queryRunner.query(
      `CREATE TABLE "release_notes" ("id" character varying NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "announcableId" character varying NOT NULL, "headline" character varying(200) NOT NULL, "body" text NOT NULL, "mediaType" "public"."release_notes_mediatype_enum", "mediaUrl" character varying(2048), "mediaStorageKey" character varying, "mediaContentType" character varying, "imageSourcePath" text, "lastUpdateOn" character varying NOT NULL, CONSTRAINT "UQ_71a7e2ea838f7c67c33b8cf0906" UNIQUE ("announcableId"), CONSTRAINT "CHK_8515170a1bc7be5db0d7603f33" CHECK (("mediaType" IS NULL AND "mediaUrl" IS NULL AND "mediaStorageKey" IS NULL AND "mediaContentType" IS NULL) OR ("mediaType" = 'loom' AND "mediaUrl" IS NOT NULL AND "mediaStorageKey" IS NULL AND "mediaContentType" IS NULL) OR ("mediaType" = 'image' AND "mediaUrl" IS NULL AND "mediaStorageKey" IS NOT NULL AND "mediaContentType" IS NOT NULL)), CONSTRAINT "PK_179a834cbb85caae10634bc7bf3" PRIMARY KEY ("id"))`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "release_notes"`);
    await queryRunner.query(
      `DROP TYPE "public"."release_notes_mediatype_enum"`,
    );
  }
}
