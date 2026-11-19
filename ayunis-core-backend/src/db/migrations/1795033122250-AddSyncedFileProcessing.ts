import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSyncedFileProcessing1795033122250 implements MigrationInterface {
  name = 'AddSyncedFileProcessing1795033122250';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "sources" ADD "replacesSourceId" character varying`,
    );
    await queryRunner.query(
      `ALTER TABLE "knowledge_base_synced_files" ADD "lastSourceId" character varying`,
    );
    await queryRunner.query(
      `UPDATE "knowledge_base_synced_files" SET "lastSourceId" = "sourceId" WHERE "sourceId" IS NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "knowledge_base_synced_files" ADD "processingErrorCode" character varying`,
    );
    await queryRunner.query(
      `ALTER TYPE "public"."knowledge_base_synced_files_skipreason_enum" RENAME TO "knowledge_base_synced_files_skipreason_enum_old"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."knowledge_base_synced_files_skipreason_enum" AS ENUM('unsupported_type', 'too_large', 'encrypted', 'removed_after_failure')`,
    );
    await queryRunner.query(
      `ALTER TABLE "knowledge_base_synced_files" ALTER COLUMN "skipReason" TYPE "public"."knowledge_base_synced_files_skipreason_enum" USING "skipReason"::"text"::"public"."knowledge_base_synced_files_skipreason_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE "public"."knowledge_base_synced_files_skipreason_enum_old"`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_4c0e64522786cfd044b3d85b85" ON "sources" ("replacesSourceId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_28cfc0bcde6ab84a8c8f646d47" ON "knowledge_base_synced_files" ("lastSourceId") `,
    );
    await queryRunner.query(
      `ALTER TABLE "sources" ADD CONSTRAINT "FK_4c0e64522786cfd044b3d85b85a" FOREIGN KEY ("replacesSourceId") REFERENCES "sources"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "sources" DROP CONSTRAINT "FK_4c0e64522786cfd044b3d85b85a"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_28cfc0bcde6ab84a8c8f646d47"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_4c0e64522786cfd044b3d85b85"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."knowledge_base_synced_files_skipreason_enum_old" AS ENUM('encrypted', 'too_large', 'unsupported_type')`,
    );
    await queryRunner.query(
      `ALTER TABLE "knowledge_base_synced_files" ALTER COLUMN "skipReason" TYPE "public"."knowledge_base_synced_files_skipreason_enum_old" USING "skipReason"::"text"::"public"."knowledge_base_synced_files_skipreason_enum_old"`,
    );
    await queryRunner.query(
      `DROP TYPE "public"."knowledge_base_synced_files_skipreason_enum"`,
    );
    await queryRunner.query(
      `ALTER TYPE "public"."knowledge_base_synced_files_skipreason_enum_old" RENAME TO "knowledge_base_synced_files_skipreason_enum"`,
    );
    await queryRunner.query(
      `ALTER TABLE "knowledge_base_synced_files" DROP COLUMN "processingErrorCode"`,
    );
    await queryRunner.query(
      `ALTER TABLE "knowledge_base_synced_files" DROP COLUMN "lastSourceId"`,
    );
    await queryRunner.query(
      `ALTER TABLE "sources" DROP COLUMN "replacesSourceId"`,
    );
  }
}
