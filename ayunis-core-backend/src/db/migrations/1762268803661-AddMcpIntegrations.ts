import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddMcpIntegrations1762268803661 implements MigrationInterface {
  name = 'AddMcpIntegrations1762268803661';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "sources" DROP CONSTRAINT IF EXISTS "FK_b8571f7b820de796d0b0cef0e86"`,
    );
    await queryRunner.query(
      `CREATE TABLE "mcp_integration_auth_methods" ("id" character varying NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "integrationId" character varying NOT NULL, "secret" text, "headerName" character varying DEFAULT 'X-API-Key', "authToken" text, "clientId" character varying, "clientSecret" text, "accessToken" text, "refreshToken" text, "tokenExpiresAt" TIMESTAMP, "auth_type" character varying NOT NULL, CONSTRAINT "REL_f9a00329298c444ddc3f0d200c" UNIQUE ("integrationId"), CONSTRAINT "PK_a0d873d844c1ee6e6e5a1c4c701" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_0176c400989b6d4f55b5c9ad07" ON "mcp_integration_auth_methods" ("auth_type") `,
    );
    await queryRunner.query(
      `CREATE TABLE "mcp_integrations" ("id" character varying NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "orgId" character varying NOT NULL, "name" character varying NOT NULL, "serverUrl" character varying NOT NULL, "enabled" boolean NOT NULL DEFAULT true, "connectionStatus" character varying NOT NULL DEFAULT 'pending', "lastConnectionError" text, "lastConnectionCheck" TIMESTAMP, "predefined_slug" character varying, "integration_type" character varying NOT NULL, CONSTRAINT "UQ_f3e216b77c0ad4091cb388efe5c" UNIQUE ("orgId", "predefined_slug"), CONSTRAINT "PK_80fa2347175d562971ff7d2fe93" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_a301d61fcf669cda7260680ad7" ON "mcp_integrations" ("integration_type") `,
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
    if (await queryRunner.hasColumn('sources', 'createdByLLM')) {
      await queryRunner.query(
        `ALTER TABLE "sources" DROP COLUMN "createdByLLM"`,
      );
    }
    await queryRunner.query(
      `ALTER TABLE "sources" DROP CONSTRAINT IF EXISTS "UQ_b8571f7b820de796d0b0cef0e86"`,
    );
    if (await queryRunner.hasColumn('sources', 'sourceId')) {
      await queryRunner.query(`ALTER TABLE "sources" DROP COLUMN "sourceId"`);
    }
    const result = (await queryRunner.query(
      `SELECT EXISTS (
        SELECT 1
        FROM pg_type
        WHERE typname = 'sources_createdby_enum'
      ) AS "exists"`,
    )) as Array<{ exists: boolean }>;
    const createdByTypeExists = result[0]?.exists ?? false;
    if (!createdByTypeExists) {
      await queryRunner.query(
        `CREATE TYPE "public"."sources_createdby_enum" AS ENUM('user', 'llm', 'system')`,
      );
    }
    if (!(await queryRunner.hasColumn('sources', 'createdBy'))) {
      await queryRunner.query(
        `ALTER TABLE "sources" ADD "createdBy" "public"."sources_createdby_enum" NOT NULL DEFAULT 'user'`,
      );
    }
    await queryRunner.query(
      `ALTER TABLE "subscriptions" DROP CONSTRAINT IF EXISTS "FK_16519322477ef8b09d68ce04889"`,
    );
    await queryRunner.query(
      `ALTER TABLE "subscriptions" DROP CONSTRAINT IF EXISTS "REL_16519322477ef8b09d68ce0488"`,
    );
    await queryRunner.query(
      `ALTER TABLE "source_content_chunks" DROP CONSTRAINT IF EXISTS "FK_bd61e255ed429f6f327137c3f69"`,
    );
    if (await queryRunner.hasColumn('source_content_chunks', 'sourceId')) {
      await queryRunner.query(
        `ALTER TABLE "source_content_chunks" ALTER COLUMN "sourceId" DROP NOT NULL`,
      );
    }
    await queryRunner.query(
      `ALTER TABLE "subscriptions" ADD CONSTRAINT "FK_16519322477ef8b09d68ce04889" FOREIGN KEY ("orgId") REFERENCES "orgs"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "source_content_chunks" ADD CONSTRAINT "FK_bd61e255ed429f6f327137c3f69" FOREIGN KEY ("sourceId") REFERENCES "text_source_details_record"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "mcp_integration_auth_methods" ADD CONSTRAINT "FK_f9a00329298c444ddc3f0d200c0" FOREIGN KEY ("integrationId") REFERENCES "mcp_integrations"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
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
      `ALTER TABLE "mcp_integration_auth_methods" DROP CONSTRAINT "FK_f9a00329298c444ddc3f0d200c0"`,
    );
    await queryRunner.query(
      `ALTER TABLE "source_content_chunks" DROP CONSTRAINT "FK_bd61e255ed429f6f327137c3f69"`,
    );
    await queryRunner.query(
      `ALTER TABLE "subscriptions" DROP CONSTRAINT "FK_16519322477ef8b09d68ce04889"`,
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
    await queryRunner.query(`ALTER TABLE "sources" DROP COLUMN "createdBy"`);
    const resultDown = (await queryRunner.query(
      `SELECT EXISTS (
        SELECT 1
        FROM pg_type
        WHERE typname = 'sources_createdby_enum'
      ) AS "exists"`,
    )) as Array<{ exists: boolean }>;
    const createdByTypeExistsDown = resultDown[0]?.exists ?? false;
    if (createdByTypeExistsDown) {
      await queryRunner.query(`DROP TYPE "public"."sources_createdby_enum"`);
    }
    await queryRunner.query(
      `ALTER TABLE "sources" ADD "sourceId" character varying`,
    );
    await queryRunner.query(
      `ALTER TABLE "sources" ADD CONSTRAINT "UQ_b8571f7b820de796d0b0cef0e86" UNIQUE ("sourceId")`,
    );
    await queryRunner.query(
      `ALTER TABLE "sources" ADD "createdByLLM" boolean NOT NULL DEFAULT false`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_7a73ddc48bd3b817feb4340a02"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_b89814344d48d983f734ce432b"`,
    );
    await queryRunner.query(`DROP TABLE "agent_mcp_integrations"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_a301d61fcf669cda7260680ad7"`,
    );
    await queryRunner.query(`DROP TABLE "mcp_integrations"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_0176c400989b6d4f55b5c9ad07"`,
    );
    await queryRunner.query(`DROP TABLE "mcp_integration_auth_methods"`);
    await queryRunner.query(
      `ALTER TABLE "sources" ADD CONSTRAINT "FK_b8571f7b820de796d0b0cef0e86" FOREIGN KEY ("sourceId") REFERENCES "text_source_details_record"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }
}
