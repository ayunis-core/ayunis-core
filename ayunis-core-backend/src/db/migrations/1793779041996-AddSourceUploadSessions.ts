import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSourceUploadSessions1793779041996 implements MigrationInterface {
  name = 'AddSourceUploadSessions1793779041996';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."source_upload_sessions_targettype_enum" AS ENUM('thread', 'skill', 'knowledge_base')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."source_upload_sessions_status_enum" AS ENUM('pending', 'sources_created', 'completed', 'expired', 'aborted')`,
    );
    await queryRunner.query(
      `CREATE TABLE "source_upload_sessions" ("id" character varying NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "orgId" character varying NOT NULL, "userId" character varying, "targetType" "public"."source_upload_sessions_targettype_enum" NOT NULL, "targetId" character varying NOT NULL, "fileName" character varying NOT NULL, "fileType" character varying NOT NULL, "fileSize" bigint NOT NULL, "storageKey" character varying NOT NULL, "multipart" boolean NOT NULL DEFAULT false, "multipartUploadId" character varying, "expectedETag" character varying, "status" "public"."source_upload_sessions_status_enum" NOT NULL, "sources" jsonb NOT NULL DEFAULT '[]', "expiresAt" TIMESTAMP NOT NULL, CONSTRAINT "PK_54887f799038f37796e74260128" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_668b55ac1d21e7337a98a94d89" ON "source_upload_sessions" ("orgId") `,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_source_upload_sessions_storageKey" ON "source_upload_sessions" ("storageKey") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_082d25cab7c4e2e401d8f5992e" ON "source_upload_sessions" ("status") `,
    );
    await queryRunner.query(
      `ALTER TABLE "source_upload_sessions" ADD CONSTRAINT "FK_668b55ac1d21e7337a98a94d898" FOREIGN KEY ("orgId") REFERENCES "orgs"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "source_upload_sessions" ADD CONSTRAINT "FK_b56fa1165ecd3db0c184824a86c" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "public"."IDX_source_upload_sessions_storageKey"`,
    );
    await queryRunner.query(
      `ALTER TABLE "source_upload_sessions" DROP CONSTRAINT "FK_b56fa1165ecd3db0c184824a86c"`,
    );
    await queryRunner.query(
      `ALTER TABLE "source_upload_sessions" DROP CONSTRAINT "FK_668b55ac1d21e7337a98a94d898"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_082d25cab7c4e2e401d8f5992e"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_668b55ac1d21e7337a98a94d89"`,
    );
    await queryRunner.query(`DROP TABLE "source_upload_sessions"`);
    await queryRunner.query(
      `DROP TYPE "public"."source_upload_sessions_status_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE "public"."source_upload_sessions_targettype_enum"`,
    );
  }
}
