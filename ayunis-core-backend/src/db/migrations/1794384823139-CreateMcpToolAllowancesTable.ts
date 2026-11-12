import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateMcpToolAllowancesTable1794384823139 implements MigrationInterface {
  name = 'CreateMcpToolAllowancesTable1794384823139';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "mcp_tool_allowances" ("id" character varying NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "user_id" character varying NOT NULL, "integration_id" character varying NOT NULL, "tool_name" character varying NOT NULL, CONSTRAINT "UQ_7d96bcfc105e0a276b162293175" UNIQUE ("user_id", "integration_id", "tool_name"), CONSTRAINT "PK_2f4453c35d3a37ca399d04a4388" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "mcp_tool_allowances" ADD CONSTRAINT "FK_ff59b9bbaace34017a5dc73555e" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "mcp_tool_allowances" ADD CONSTRAINT "FK_bd9d68eff159c10755dc050ff65" FOREIGN KEY ("integration_id") REFERENCES "mcp_integrations"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "mcp_tool_allowances" DROP CONSTRAINT "FK_bd9d68eff159c10755dc050ff65"`,
    );
    await queryRunner.query(
      `ALTER TABLE "mcp_tool_allowances" DROP CONSTRAINT "FK_ff59b9bbaace34017a5dc73555e"`,
    );
    await queryRunner.query(`DROP TABLE "mcp_tool_allowances"`);
  }
}
