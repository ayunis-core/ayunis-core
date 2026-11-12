import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddRecordingSummaries1794455121468 implements MigrationInterface {
  name = 'AddRecordingSummaries1794455121468';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."recording_summaries_status_enum" AS ENUM('pending', 'running', 'ready', 'failed')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."recording_summaries_failure_enum" AS ENUM('NO_SUMMARY_MODEL', 'CREDIT_BUDGET_EXCEEDED', 'CREDIT_LIMIT_EXCEEDED', 'TRANSCRIPT_TOO_LONG', 'TRANSCRIPT_EMPTY', 'PROVIDER_ERROR', 'SUMMARY_FAILED')`,
    );
    await queryRunner.query(
      `CREATE TABLE "recording_summaries" ("id" character varying NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "recordingId" character varying NOT NULL, "runId" uuid NOT NULL, "status" "public"."recording_summaries_status_enum" NOT NULL, "triggeredByUserId" character varying, "content" text, "modelId" character varying, "modelName" character varying, "generatedAt" TIMESTAMP, "failure" "public"."recording_summaries_failure_enum", CONSTRAINT "REL_f2945d48b45daf43771170504d" UNIQUE ("recordingId"), CONSTRAINT "PK_d50ec5ad361c2004210e6107e94" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_777fa59d44780815a09c7dd6ab" ON "recording_summaries" ("triggeredByUserId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_074595131c8bfe0f3742246f69" ON "recording_summaries" ("modelId") `,
    );
    await queryRunner.query(
      `ALTER TABLE "recording_summaries" ADD CONSTRAINT "FK_f2945d48b45daf43771170504db" FOREIGN KEY ("recordingId") REFERENCES "recordings"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "recording_summaries" ADD CONSTRAINT "FK_777fa59d44780815a09c7dd6ab5" FOREIGN KEY ("triggeredByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "recording_summaries" ADD CONSTRAINT "FK_074595131c8bfe0f3742246f69c" FOREIGN KEY ("modelId") REFERENCES "models"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "recording_summaries" DROP CONSTRAINT "FK_074595131c8bfe0f3742246f69c"`,
    );
    await queryRunner.query(
      `ALTER TABLE "recording_summaries" DROP CONSTRAINT "FK_777fa59d44780815a09c7dd6ab5"`,
    );
    await queryRunner.query(
      `ALTER TABLE "recording_summaries" DROP CONSTRAINT "FK_f2945d48b45daf43771170504db"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_074595131c8bfe0f3742246f69"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_777fa59d44780815a09c7dd6ab"`,
    );
    await queryRunner.query(`DROP TABLE "recording_summaries"`);
    await queryRunner.query(
      `DROP TYPE "public"."recording_summaries_failure_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE "public"."recording_summaries_status_enum"`,
    );
  }
}
