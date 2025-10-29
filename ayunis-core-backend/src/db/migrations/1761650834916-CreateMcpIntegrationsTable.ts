import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateMcpIntegrationsTable1761650834916
  implements MigrationInterface
{
  name = 'CreateMcpIntegrationsTable1761650834916';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create mcp_integrations table with single-table inheritance
    await queryRunner.query(`
            CREATE TABLE "mcp_integrations" (
                "id" character varying NOT NULL,
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
                "name" character varying(255) NOT NULL,
                "auth_method" character varying(50),
                "auth_header_name" character varying(100),
                "encrypted_credentials" text,
                "enabled" boolean NOT NULL DEFAULT true,
                "organization_id" character varying NOT NULL,
                "slug" character varying(50),
                "server_url" text,
                "type" character varying NOT NULL,
                CONSTRAINT "UQ_mcp_integration_org_name" UNIQUE ("organization_id", "name"),
                CONSTRAINT "PK_mcp_integrations" PRIMARY KEY ("id")
            )
        `);

    // Create index on organization_id for efficient lookups
    await queryRunner.query(`
            CREATE INDEX "idx_mcp_integrations_org" ON "mcp_integrations" ("organization_id")
        `);

    // Create partial index on enabled column for efficient filtering
    await queryRunner.query(`
            CREATE INDEX "idx_mcp_integrations_enabled" ON "mcp_integrations" ("enabled") WHERE enabled = true
        `);

    // Create index on discriminator column
    await queryRunner.query(`
            CREATE INDEX "idx_mcp_integrations_type" ON "mcp_integrations" ("type")
        `);

    // Add foreign key constraint with cascade delete
    await queryRunner.query(`
            ALTER TABLE "mcp_integrations"
            ADD CONSTRAINT "FK_mcp_integrations_org"
            FOREIGN KEY ("organization_id")
            REFERENCES "orgs"("id")
            ON DELETE CASCADE
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop foreign key constraint
    await queryRunner.query(`
            ALTER TABLE "mcp_integrations" DROP CONSTRAINT "FK_mcp_integrations_org"
        `);

    // Drop indexes
    await queryRunner.query(`
            DROP INDEX "public"."idx_mcp_integrations_type"
        `);
    await queryRunner.query(`
            DROP INDEX "public"."idx_mcp_integrations_enabled"
        `);
    await queryRunner.query(`
            DROP INDEX "public"."idx_mcp_integrations_org"
        `);

    // Drop table
    await queryRunner.query(`
            DROP TABLE "mcp_integrations"
        `);
  }
}
