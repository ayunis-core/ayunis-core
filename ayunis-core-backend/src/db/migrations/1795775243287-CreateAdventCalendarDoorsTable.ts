import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateAdventCalendarDoorsTable1795775243287 implements MigrationInterface {
  name = 'CreateAdventCalendarDoorsTable1795775243287';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."advent_calendar_doors_mediatype_enum" AS ENUM('image', 'vimeo')`,
    );
    await queryRunner.query(
      `CREATE TABLE "advent_calendar_doors" ("day" smallint NOT NULL, "title" character varying(200) NOT NULL, "body" character varying(5000) NOT NULL, "mediaType" "public"."advent_calendar_doors_mediatype_enum", "mediaStorageKey" character varying, "mediaContentType" character varying, "vimeoVideoId" character varying, "vimeoHash" character varying, "buttons" jsonb NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "CHK_5bdcfc763166bad0af17d19d97" CHECK (("mediaType" IS NULL AND "mediaStorageKey" IS NULL AND "mediaContentType" IS NULL AND "vimeoVideoId" IS NULL AND "vimeoHash" IS NULL) OR ("mediaType" = 'image' AND "mediaStorageKey" IS NOT NULL AND "mediaContentType" IS NOT NULL AND "vimeoVideoId" IS NULL AND "vimeoHash" IS NULL) OR ("mediaType" = 'vimeo' AND "mediaStorageKey" IS NULL AND "mediaContentType" IS NULL AND "vimeoVideoId" IS NOT NULL)), CONSTRAINT "CHK_bbb58bbd0e073f509adc09ce13" CHECK ("day" BETWEEN 1 AND 24), CONSTRAINT "PK_38a0f1d24a482ed3a7626c1657d" PRIMARY KEY ("day"))`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "advent_calendar_doors"`);
    await queryRunner.query(
      `DROP TYPE "public"."advent_calendar_doors_mediatype_enum"`,
    );
  }
}
