import type { MigrationInterface, QueryRunner } from 'typeorm';

export class RecordSourceEmbeddingModelAndReindexingStatus1795001788391 implements MigrationInterface {
  name = 'RecordSourceEmbeddingModelAndReindexingStatus1795001788391';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "sources" ADD "embeddingModelId" character varying`,
    );
    await queryRunner.query(
      `ALTER TYPE "public"."sources_status_enum" RENAME TO "sources_status_enum_old"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."sources_status_enum" AS ENUM('processing', 'ready', 'failed', 'reindexing')`,
    );
    await queryRunner.query(
      `ALTER TABLE "sources" ALTER COLUMN "status" DROP DEFAULT`,
    );
    await queryRunner.query(
      `ALTER TABLE "sources" ALTER COLUMN "status" TYPE "public"."sources_status_enum" USING "status"::"text"::"public"."sources_status_enum"`,
    );
    await queryRunner.query(
      `ALTER TABLE "sources" ALTER COLUMN "status" SET DEFAULT 'ready'`,
    );
    await queryRunner.query(`DROP TYPE "public"."sources_status_enum_old"`);
    await queryRunner.query(
      `ALTER TABLE "sources" ADD CONSTRAINT "FK_e7966f816caa549838f3c12b5b2" FOREIGN KEY ("embeddingModelId") REFERENCES "models"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "sources" DROP CONSTRAINT "FK_e7966f816caa549838f3c12b5b2"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."sources_status_enum_old" AS ENUM('failed', 'processing', 'ready')`,
    );
    await queryRunner.query(
      `ALTER TABLE "sources" ALTER COLUMN "status" DROP DEFAULT`,
    );
    await queryRunner.query(
      `ALTER TABLE "sources" ALTER COLUMN "status" TYPE "public"."sources_status_enum_old" USING "status"::"text"::"public"."sources_status_enum_old"`,
    );
    await queryRunner.query(
      `ALTER TABLE "sources" ALTER COLUMN "status" SET DEFAULT 'ready'`,
    );
    await queryRunner.query(`DROP TYPE "public"."sources_status_enum"`);
    await queryRunner.query(
      `ALTER TYPE "public"."sources_status_enum_old" RENAME TO "sources_status_enum"`,
    );
    await queryRunner.query(
      `ALTER TABLE "sources" DROP COLUMN "embeddingModelId"`,
    );
  }
}
