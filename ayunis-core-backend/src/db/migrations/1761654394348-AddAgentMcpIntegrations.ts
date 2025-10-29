import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAgentMcpIntegrations1761654394348
  implements MigrationInterface
{
  name = 'AddAgentMcpIntegrations1761654394348';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "sources" DROP CONSTRAINT "FK_b8571f7b820de796d0b0cef0e86"`,
    );
    await queryRunner.query(
      `ALTER TABLE "mcp_integrations" DROP CONSTRAINT "FK_mcp_integrations_org"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."idx_mcp_integrations_enabled"`,
    );
    await queryRunner.query(`DROP INDEX "public"."idx_mcp_integrations_type"`);
    await queryRunner.query(
      `ALTER TABLE "mcp_integrations" DROP CONSTRAINT "UQ_mcp_integration_org_name"`,
    );
    await queryRunner.query(
      `CREATE TABLE "agent_mcp_integrations" ("agentsId" character varying NOT NULL, "mcpIntegrationsId" character varying NOT NULL, CONSTRAINT "PK_da6f5d45db9851da25f4d8506c7" PRIMARY KEY ("agentsId", "mcpIntegrationsId"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_b89814344d48d983f734ce432b" ON "agent_mcp_integrations" ("agentsId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_7a73ddc48bd3b817feb4340a02" ON "agent_mcp_integrations" ("mcpIntegrationsId") `,
    );
    await queryRunner.query(
      `ALTER TABLE "sources" DROP CONSTRAINT "UQ_b8571f7b820de796d0b0cef0e86"`,
    );
    await queryRunner.query(`ALTER TABLE "sources" DROP COLUMN "sourceId"`);
    await queryRunner.query(
      `ALTER TABLE "mcp_integrations" ADD "organizationId" character varying`,
    );
    await queryRunner.query(
      `ALTER TABLE "subscriptions" DROP CONSTRAINT "FK_16519322477ef8b09d68ce04889"`,
    );
    await queryRunner.query(
      `ALTER TABLE "subscriptions" DROP CONSTRAINT "REL_16519322477ef8b09d68ce0488"`,
    );
    await queryRunner.query(
      `ALTER TABLE "source_content_chunks" DROP CONSTRAINT "FK_bd61e255ed429f6f327137c3f69"`,
    );
    await queryRunner.query(
      `ALTER TABLE "source_content_chunks" ALTER COLUMN "sourceId" DROP NOT NULL`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_c8eddaecc592cea7617957baa0" ON "mcp_integrations" ("type") `,
    );
    await queryRunner.query(
      `ALTER TABLE "mcp_integrations" ADD CONSTRAINT "UQ_ee23422cf88c2c69cf19e1878d6" UNIQUE ("organization_id", "name")`,
    );
    await queryRunner.query(
      `ALTER TABLE "subscriptions" ADD CONSTRAINT "FK_16519322477ef8b09d68ce04889" FOREIGN KEY ("orgId") REFERENCES "orgs"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "source_content_chunks" ADD CONSTRAINT "FK_bd61e255ed429f6f327137c3f69" FOREIGN KEY ("sourceId") REFERENCES "text_source_details_record"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "mcp_integrations" ADD CONSTRAINT "FK_361519bc4014d1026acdeb2ee30" FOREIGN KEY ("organizationId") REFERENCES "orgs"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "agent_mcp_integrations" ADD CONSTRAINT "FK_b89814344d48d983f734ce432b0" FOREIGN KEY ("agentsId") REFERENCES "agents"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
    );
    await queryRunner.query(
      `ALTER TABLE "agent_mcp_integrations" ADD CONSTRAINT "FK_7a73ddc48bd3b817feb4340a022" FOREIGN KEY ("mcpIntegrationsId") REFERENCES "mcp_integrations"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "agent_mcp_integrations" DROP CONSTRAINT "FK_7a73ddc48bd3b817feb4340a022"`,
    );
    await queryRunner.query(
      `ALTER TABLE "agent_mcp_integrations" DROP CONSTRAINT "FK_b89814344d48d983f734ce432b0"`,
    );
    await queryRunner.query(
      `ALTER TABLE "mcp_integrations" DROP CONSTRAINT "FK_361519bc4014d1026acdeb2ee30"`,
    );
    await queryRunner.query(
      `ALTER TABLE "source_content_chunks" DROP CONSTRAINT "FK_bd61e255ed429f6f327137c3f69"`,
    );
    await queryRunner.query(
      `ALTER TABLE "subscriptions" DROP CONSTRAINT "FK_16519322477ef8b09d68ce04889"`,
    );
    await queryRunner.query(
      `ALTER TABLE "mcp_integrations" DROP CONSTRAINT "UQ_ee23422cf88c2c69cf19e1878d6"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_c8eddaecc592cea7617957baa0"`,
    );
    await queryRunner.query(
      `ALTER TABLE "source_content_chunks" ALTER COLUMN "sourceId" SET NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "source_content_chunks" ADD CONSTRAINT "FK_bd61e255ed429f6f327137c3f69" FOREIGN KEY ("sourceId") REFERENCES "text_source_details_record"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "subscriptions" ADD CONSTRAINT "REL_16519322477ef8b09d68ce0488" UNIQUE ("orgId")`,
    );
    await queryRunner.query(
      `ALTER TABLE "subscriptions" ADD CONSTRAINT "FK_16519322477ef8b09d68ce04889" FOREIGN KEY ("orgId") REFERENCES "orgs"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "mcp_integrations" DROP COLUMN "organizationId"`,
    );
    await queryRunner.query(
      `ALTER TABLE "sources" ADD "sourceId" character varying`,
    );
    await queryRunner.query(
      `ALTER TABLE "sources" ADD CONSTRAINT "UQ_b8571f7b820de796d0b0cef0e86" UNIQUE ("sourceId")`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_7a73ddc48bd3b817feb4340a02"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_b89814344d48d983f734ce432b"`,
    );
    await queryRunner.query(`DROP TABLE "agent_mcp_integrations"`);
    await queryRunner.query(
      `ALTER TABLE "mcp_integrations" ADD CONSTRAINT "UQ_mcp_integration_org_name" UNIQUE ("name", "organization_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_mcp_integrations_type" ON "mcp_integrations" ("type") `,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_mcp_integrations_enabled" ON "mcp_integrations" ("enabled") WHERE (enabled = true)`,
    );
    await queryRunner.query(
      `ALTER TABLE "mcp_integrations" ADD CONSTRAINT "FK_mcp_integrations_org" FOREIGN KEY ("organization_id") REFERENCES "orgs"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "sources" ADD CONSTRAINT "FK_b8571f7b820de796d0b0cef0e86" FOREIGN KEY ("sourceId") REFERENCES "text_source_details_record"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }
}
