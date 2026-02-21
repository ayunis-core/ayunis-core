import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddMarketplaceMcpIntegrations1771418124769
  implements MigrationInterface
{
  name = 'AddMarketplaceMcpIntegrations1771418124769';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "mcp_integration_user_configs" ("id" character varying NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "integration_id" uuid NOT NULL, "user_id" uuid NOT NULL, "config_values" jsonb NOT NULL DEFAULT '{}', CONSTRAINT "UQ_d2b5a8f0850eeab6b6dfb4885e8" UNIQUE ("integration_id", "user_id"), CONSTRAINT "PK_e7085d7749f13c8ba6b6a7e1f7d" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "mcp_integrations" ADD "marketplace_identifier" character varying`,
    );
    await queryRunner.query(
      `ALTER TABLE "mcp_integrations" ADD "config_schema" jsonb`,
    );
    await queryRunner.query(
      `ALTER TABLE "mcp_integrations" ADD "org_config_values" jsonb DEFAULT '{}'`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_marketplace_org_identifier" ON "mcp_integrations" ("org_id", "marketplace_identifier") WHERE "marketplace_identifier" IS NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "mcp_integration_user_configs" ADD CONSTRAINT "FK_user_config_integration" FOREIGN KEY ("integration_id") REFERENCES "mcp_integrations"("id") ON DELETE CASCADE`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "mcp_integration_user_configs" DROP CONSTRAINT "FK_user_config_integration"`,
    );
    await queryRunner.query(`DROP INDEX "UQ_marketplace_org_identifier"`);
    await queryRunner.query(
      `ALTER TABLE "mcp_integrations" DROP COLUMN "org_config_values"`,
    );
    await queryRunner.query(
      `ALTER TABLE "mcp_integrations" DROP COLUMN "config_schema"`,
    );
    await queryRunner.query(
      `ALTER TABLE "mcp_integrations" DROP COLUMN "marketplace_identifier"`,
    );
    await queryRunner.query(`DROP TABLE "mcp_integration_user_configs"`);
  }
}
