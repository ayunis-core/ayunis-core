import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateKnowledgeBaseSyncTables1795019918718 implements MigrationInterface {
  name = 'CreateKnowledgeBaseSyncTables1795019918718';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."knowledge_base_synced_locations_state_enum" AS ENUM('active', 'no_longer_accessible')`,
    );
    await queryRunner.query(
      `CREATE TABLE "knowledge_base_synced_locations" ("id" character varying NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "orgId" character varying NOT NULL, "knowledgeBaseId" character varying NOT NULL, "connectorId" character varying NOT NULL, "location" text NOT NULL, "cursor" text, "state" "public"."knowledge_base_synced_locations_state_enum" NOT NULL DEFAULT 'active', "lastSyncedAt" TIMESTAMP, CONSTRAINT "UQ_b3eb2092f1c84f310c255145ff9" UNIQUE ("knowledgeBaseId", "connectorId", "location"), CONSTRAINT "PK_1a0e4e05cf8ccbab201498139e1" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_96e999535e0d7692b7b84217f2" ON "knowledge_base_synced_locations" ("orgId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_c0edc550cf43ab8bb6a98ceda5" ON "knowledge_base_synced_locations" ("connectorId") `,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."knowledge_base_synced_files_state_enum" AS ENUM('imported', 'skipped', 'awaiting_capacity')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."knowledge_base_synced_files_skipreason_enum" AS ENUM('unsupported_type', 'too_large', 'encrypted')`,
    );
    await queryRunner.query(
      `CREATE TABLE "knowledge_base_synced_files" ("id" character varying NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "locationId" character varying NOT NULL, "externalId" text NOT NULL, "name" text NOT NULL, "path" text NOT NULL, "version" text NOT NULL, "size" bigint NOT NULL, "state" "public"."knowledge_base_synced_files_state_enum" NOT NULL, "skipReason" "public"."knowledge_base_synced_files_skipreason_enum", "sourceId" character varying, "documentVersion" text, CONSTRAINT "UQ_a42d5771787989e2e8105bf0d7e" UNIQUE ("locationId", "externalId"), CONSTRAINT "CHK_knowledge_base_synced_files_source" CHECK ("state" = 'imported' OR "sourceId" IS NULL), CONSTRAINT "CHK_knowledge_base_synced_files_skip_reason" CHECK (("state" = 'skipped') = ("skipReason" IS NOT NULL)), CONSTRAINT "PK_aba3d211fd6bf39942a88927368" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_fd06412f28d0d625f2d339d1db" ON "knowledge_base_synced_files" ("sourceId") `,
    );
    await queryRunner.query(
      `ALTER TABLE "knowledge_base_synced_locations" ADD CONSTRAINT "FK_96e999535e0d7692b7b84217f2d" FOREIGN KEY ("orgId") REFERENCES "orgs"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "knowledge_base_synced_locations" ADD CONSTRAINT "FK_81ac8024f27af0bd64602f0ed78" FOREIGN KEY ("knowledgeBaseId") REFERENCES "knowledge_bases"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "knowledge_base_synced_locations" ADD CONSTRAINT "FK_c0edc550cf43ab8bb6a98ceda5f" FOREIGN KEY ("connectorId") REFERENCES "connectors"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "knowledge_base_synced_files" ADD CONSTRAINT "FK_b12d3030d27e00b0f3ebadc5eff" FOREIGN KEY ("locationId") REFERENCES "knowledge_base_synced_locations"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "knowledge_base_synced_files" ADD CONSTRAINT "FK_fd06412f28d0d625f2d339d1db7" FOREIGN KEY ("sourceId") REFERENCES "sources"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "knowledge_base_synced_files" DROP CONSTRAINT "FK_fd06412f28d0d625f2d339d1db7"`,
    );
    await queryRunner.query(
      `ALTER TABLE "knowledge_base_synced_files" DROP CONSTRAINT "FK_b12d3030d27e00b0f3ebadc5eff"`,
    );
    await queryRunner.query(
      `ALTER TABLE "knowledge_base_synced_locations" DROP CONSTRAINT "FK_c0edc550cf43ab8bb6a98ceda5f"`,
    );
    await queryRunner.query(
      `ALTER TABLE "knowledge_base_synced_locations" DROP CONSTRAINT "FK_81ac8024f27af0bd64602f0ed78"`,
    );
    await queryRunner.query(
      `ALTER TABLE "knowledge_base_synced_locations" DROP CONSTRAINT "FK_96e999535e0d7692b7b84217f2d"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_fd06412f28d0d625f2d339d1db"`,
    );
    await queryRunner.query(`DROP TABLE "knowledge_base_synced_files"`);
    await queryRunner.query(
      `DROP TYPE "public"."knowledge_base_synced_files_skipreason_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE "public"."knowledge_base_synced_files_state_enum"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_c0edc550cf43ab8bb6a98ceda5"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_96e999535e0d7692b7b84217f2"`,
    );
    await queryRunner.query(`DROP TABLE "knowledge_base_synced_locations"`);
    await queryRunner.query(
      `DROP TYPE "public"."knowledge_base_synced_locations_state_enum"`,
    );
  }
}
