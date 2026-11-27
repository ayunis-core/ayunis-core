import type { MigrationInterface, QueryRunner } from 'typeorm';

export class MakeSyncedLocationsProviderBased1795382453624 implements MigrationInterface {
  name = 'MakeSyncedLocationsProviderBased1795382453624';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "knowledge_base_synced_locations" DROP CONSTRAINT "UQ_b3eb2092f1c84f310c255145ff9"`,
    );
    // Every existing location syncs through a connector. One connector per
    // organization and product, and one product so far, keep the new
    // unique constraint satisfied.
    await queryRunner.query(
      `ALTER TABLE "knowledge_base_synced_locations" ADD "provider" character varying NOT NULL DEFAULT 'connector'`,
    );
    await queryRunner.query(
      `ALTER TABLE "knowledge_base_synced_locations" ALTER COLUMN "provider" DROP DEFAULT`,
    );
    await queryRunner.query(
      `ALTER TABLE "knowledge_base_synced_locations" DROP CONSTRAINT "FK_c0edc550cf43ab8bb6a98ceda5f"`,
    );
    await queryRunner.query(
      `ALTER TABLE "knowledge_base_synced_locations" ALTER COLUMN "connectorId" DROP NOT NULL`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_629574f84ddc28d4a3294ede54" ON "knowledge_base_synced_locations" ("provider") `,
    );
    await queryRunner.query(
      `ALTER TABLE "knowledge_base_synced_locations" ADD CONSTRAINT "CHK_91e4e5cc525b9bb0ad2e725e91" CHECK (("provider" = 'connector') = ("connectorId" IS NOT NULL))`,
    );
    await queryRunner.query(
      `ALTER TABLE "knowledge_base_synced_locations" ADD CONSTRAINT "UQ_e6ed66546525cc40750e5f432af" UNIQUE ("knowledgeBaseId", "provider", "location")`,
    );
    await queryRunner.query(
      `ALTER TABLE "knowledge_base_synced_locations" ADD CONSTRAINT "FK_c0edc550cf43ab8bb6a98ceda5f" FOREIGN KEY ("connectorId") REFERENCES "connectors"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "knowledge_base_synced_locations" DROP CONSTRAINT "FK_c0edc550cf43ab8bb6a98ceda5f"`,
    );
    await queryRunner.query(
      `ALTER TABLE "knowledge_base_synced_locations" DROP CONSTRAINT "UQ_e6ed66546525cc40750e5f432af"`,
    );
    await queryRunner.query(
      `ALTER TABLE "knowledge_base_synced_locations" DROP CONSTRAINT "CHK_91e4e5cc525b9bb0ad2e725e91"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_629574f84ddc28d4a3294ede54"`,
    );
    await queryRunner.query(
      `ALTER TABLE "knowledge_base_synced_locations" ALTER COLUMN "connectorId" SET NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "knowledge_base_synced_locations" ADD CONSTRAINT "FK_c0edc550cf43ab8bb6a98ceda5f" FOREIGN KEY ("connectorId") REFERENCES "connectors"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "knowledge_base_synced_locations" DROP COLUMN "provider"`,
    );
    await queryRunner.query(
      `ALTER TABLE "knowledge_base_synced_locations" ADD CONSTRAINT "UQ_b3eb2092f1c84f310c255145ff9" UNIQUE ("knowledgeBaseId", "connectorId", "location")`,
    );
  }
}
