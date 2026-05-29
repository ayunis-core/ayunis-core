import type { MigrationInterface, QueryRunner } from 'typeorm';

export class DropAgents1779974633189 implements MigrationInterface {
  name = 'DropAgents1779974633189';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Clean up any polymorphic share rows that still reference the agent
    // entity type. Migration 1772627745700 already migrated existing agent
    // shares to skills, so this is a safety net for any rows created since.
    await queryRunner.query(
      `DELETE FROM "shares" WHERE "entity_type" = 'agent'`,
    );

    // Drop FKs and the polymorphic shares.agent_id column.
    await queryRunner.query(
      `ALTER TABLE "shares" DROP CONSTRAINT "FK_394b8d90a8d4717d5f5cdf543c7"`,
    );
    await queryRunner.query(`ALTER TABLE "shares" DROP COLUMN "agent_id"`);

    // Drop threads.agentId (nullable + SET NULL, safe to drop directly).
    await queryRunner.query(
      `ALTER TABLE "threads" DROP CONSTRAINT "FK_d6f207f7897d73a658b3b7147eb"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_d6f207f7897d73a658b3b7147e"`,
    );
    await queryRunner.query(`ALTER TABLE "threads" DROP COLUMN "agentId"`);

    // Drop agent tables in FK-dependency order.
    await queryRunner.query(`DROP TABLE IF EXISTS "agent_mcp_integrations"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "agent_source_assignments"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "agent_tools"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "agents"`);

    // Drop orphaned enum type used by the agent_tools.toolType column.
    await queryRunner.query(`DROP TYPE IF EXISTS "agent_tools_tooltype_enum"`);
  }

  public down(): Promise<void> {
    // No-op: matches the DropPromptsTable precedent — once forward-migrated,
    // the agents feature code is gone, so a schema-only rollback would leave
    // the application unable to write to the recreated tables.
    return Promise.resolve();
  }
}
