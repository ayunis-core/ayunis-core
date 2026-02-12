import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddThreadMcpIntegrations1770929788781
  implements MigrationInterface
{
  name = 'AddThreadMcpIntegrations1770929788781';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "thread_mcp_integrations" ("threadsId" character varying NOT NULL, "mcpIntegrationsId" character varying NOT NULL, CONSTRAINT "PK_0f76f913346f6bb27fd77195117" PRIMARY KEY ("threadsId", "mcpIntegrationsId"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_b7592fd90ca07215a7586a6018" ON "thread_mcp_integrations" ("threadsId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_478a802ec5779955baa946f1af" ON "thread_mcp_integrations" ("mcpIntegrationsId") `,
    );
    await queryRunner.query(
      `ALTER TABLE "thread_mcp_integrations" ADD CONSTRAINT "FK_b7592fd90ca07215a7586a6018b" FOREIGN KEY ("threadsId") REFERENCES "threads"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
    );
    await queryRunner.query(
      `ALTER TABLE "thread_mcp_integrations" ADD CONSTRAINT "FK_478a802ec5779955baa946f1afc" FOREIGN KEY ("mcpIntegrationsId") REFERENCES "mcp_integrations"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "thread_mcp_integrations" DROP CONSTRAINT "FK_478a802ec5779955baa946f1afc"`,
    );
    await queryRunner.query(
      `ALTER TABLE "thread_mcp_integrations" DROP CONSTRAINT "FK_b7592fd90ca07215a7586a6018b"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_478a802ec5779955baa946f1af"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_b7592fd90ca07215a7586a6018"`,
    );
    await queryRunner.query(`DROP TABLE "thread_mcp_integrations"`);
  }
}
