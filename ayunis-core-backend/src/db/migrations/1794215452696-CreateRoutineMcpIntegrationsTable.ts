import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateRoutineMcpIntegrationsTable1794215452696 implements MigrationInterface {
  name = 'CreateRoutineMcpIntegrationsTable1794215452696';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "routine_mcp_integrations" ("routinesId" character varying NOT NULL, "mcpIntegrationsId" character varying NOT NULL, CONSTRAINT "PK_c228c33691a538594f8865a1c11" PRIMARY KEY ("routinesId", "mcpIntegrationsId"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_c7794c2ba4d0cbf4c92fc2c642" ON "routine_mcp_integrations" ("routinesId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_488ce5a525e6bbd25986c44d67" ON "routine_mcp_integrations" ("mcpIntegrationsId") `,
    );
    await queryRunner.query(
      `ALTER TABLE "routine_mcp_integrations" ADD CONSTRAINT "FK_c7794c2ba4d0cbf4c92fc2c6422" FOREIGN KEY ("routinesId") REFERENCES "routines"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
    );
    await queryRunner.query(
      `ALTER TABLE "routine_mcp_integrations" ADD CONSTRAINT "FK_488ce5a525e6bbd25986c44d676" FOREIGN KEY ("mcpIntegrationsId") REFERENCES "mcp_integrations"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "routine_mcp_integrations" DROP CONSTRAINT "FK_488ce5a525e6bbd25986c44d676"`,
    );
    await queryRunner.query(
      `ALTER TABLE "routine_mcp_integrations" DROP CONSTRAINT "FK_c7794c2ba4d0cbf4c92fc2c6422"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_488ce5a525e6bbd25986c44d67"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_c7794c2ba4d0cbf4c92fc2c642"`,
    );
    await queryRunner.query(`DROP TABLE "routine_mcp_integrations"`);
  }
}
