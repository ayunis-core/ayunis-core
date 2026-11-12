import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddRecordingAudioAndTranscriptSegments1794440444209 implements MigrationInterface {
  name = 'AddRecordingAudioAndTranscriptSegments1794440444209';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "source_transcript_segments" ("id" character varying NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "sourceId" character varying NOT NULL, "position" integer NOT NULL, "startSeconds" double precision NOT NULL, "endSeconds" double precision NOT NULL, "speaker" character varying, "text" text NOT NULL, CONSTRAINT "PK_a946bebee3e7ed717f902770844" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_34ec7e271ef4f233750cbf3dad" ON "source_transcript_segments" ("sourceId", "position") `,
    );
    await queryRunner.query(
      `ALTER TABLE "sources" ADD "recordingId" character varying`,
    );
    await queryRunner.query(
      `ALTER TYPE "public"."source_upload_sessions_targettype_enum" RENAME TO "source_upload_sessions_targettype_enum_old"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."source_upload_sessions_targettype_enum" AS ENUM('thread', 'skill', 'knowledge_base', 'recording')`,
    );
    await queryRunner.query(
      `ALTER TABLE "source_upload_sessions" ALTER COLUMN "targetType" TYPE "public"."source_upload_sessions_targettype_enum" USING "targetType"::"text"::"public"."source_upload_sessions_targettype_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE "public"."source_upload_sessions_targettype_enum_old"`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_3a708a743ae36caff211bf1c49" ON "sources" ("recordingId") WHERE "recordingId" IS NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "sources" ADD CONSTRAINT "FK_032ed90400a467bf96ad8c11c05" FOREIGN KEY ("recordingId") REFERENCES "recordings"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "source_transcript_segments" ADD CONSTRAINT "FK_6d31ab3500c858baafca8ac1bc3" FOREIGN KEY ("sourceId") REFERENCES "sources"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "source_transcript_segments" DROP CONSTRAINT "FK_6d31ab3500c858baafca8ac1bc3"`,
    );
    await queryRunner.query(
      `ALTER TABLE "sources" DROP CONSTRAINT "FK_032ed90400a467bf96ad8c11c05"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_3a708a743ae36caff211bf1c49"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."source_upload_sessions_targettype_enum_old" AS ENUM('knowledge_base', 'skill', 'thread')`,
    );
    await queryRunner.query(
      `ALTER TABLE "source_upload_sessions" ALTER COLUMN "targetType" TYPE "public"."source_upload_sessions_targettype_enum_old" USING "targetType"::"text"::"public"."source_upload_sessions_targettype_enum_old"`,
    );
    await queryRunner.query(
      `DROP TYPE "public"."source_upload_sessions_targettype_enum"`,
    );
    await queryRunner.query(
      `ALTER TYPE "public"."source_upload_sessions_targettype_enum_old" RENAME TO "source_upload_sessions_targettype_enum"`,
    );
    await queryRunner.query(`ALTER TABLE "sources" DROP COLUMN "recordingId"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_34ec7e271ef4f233750cbf3dad"`,
    );
    await queryRunner.query(`DROP TABLE "source_transcript_segments"`);
  }
}
