import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSkills1770977593092 implements MigrationInterface {
  name = 'AddSkills1770977593092';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "skills" ("id" character varying NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "name" character varying NOT NULL, "shortDescription" character varying NOT NULL, "instructions" character varying NOT NULL, "isActive" boolean NOT NULL DEFAULT false, "userId" character varying NOT NULL, CONSTRAINT "UQ_skill_name_userId" UNIQUE ("name", "userId"), CONSTRAINT "PK_0d3212120f4ecedf90864d7e298" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "skill_sources" ("skillsId" character varying NOT NULL, "sourcesId" character varying NOT NULL, CONSTRAINT "PK_a4be28ee6cc5fac99de849cce7e" PRIMARY KEY ("skillsId", "sourcesId"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_c0a68476f77289d586efb303a4" ON "skill_sources" ("skillsId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_211656269c7c7b333635bc1258" ON "skill_sources" ("sourcesId") `,
    );
    await queryRunner.query(
      `CREATE TABLE "skill_mcp_integrations" ("skillsId" character varying NOT NULL, "mcpIntegrationsId" character varying NOT NULL, CONSTRAINT "PK_e955020cc4ece74b6545d84be2a" PRIMARY KEY ("skillsId", "mcpIntegrationsId"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_5e20bd35a8dd2f5ad401c58c42" ON "skill_mcp_integrations" ("skillsId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_7c3739200eea4db19609048375" ON "skill_mcp_integrations" ("mcpIntegrationsId") `,
    );
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
      `ALTER TYPE "public"."agent_tools_tooltype_enum" RENAME TO "agent_tools_tooltype_enum_old"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."agent_tools_tooltype_enum" AS ENUM('http', 'source_query', 'source_get_text', 'internet_search', 'website_content', 'send_email', 'create_calendar_event', 'code_execution', 'bar_chart', 'line_chart', 'pie_chart', 'mcp_tool', 'mcp_resource', 'mcp_prompt', 'product_knowledge', 'activate_skill', 'create_skill')`,
    );
    await queryRunner.query(
      `ALTER TABLE "agent_tools" ALTER COLUMN "toolType" TYPE "public"."agent_tools_tooltype_enum" USING "toolType"::"text"::"public"."agent_tools_tooltype_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE "public"."agent_tools_tooltype_enum_old"`,
    );
    await queryRunner.query(
      `ALTER TABLE "skills" ADD CONSTRAINT "FK_ee1265e76ea0b8c5f7daa85e817" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "skill_sources" ADD CONSTRAINT "FK_c0a68476f77289d586efb303a48" FOREIGN KEY ("skillsId") REFERENCES "skills"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
    );
    await queryRunner.query(
      `ALTER TABLE "skill_sources" ADD CONSTRAINT "FK_211656269c7c7b333635bc12585" FOREIGN KEY ("sourcesId") REFERENCES "sources"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
    );
    await queryRunner.query(
      `ALTER TABLE "skill_mcp_integrations" ADD CONSTRAINT "FK_5e20bd35a8dd2f5ad401c58c421" FOREIGN KEY ("skillsId") REFERENCES "skills"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
    );
    await queryRunner.query(
      `ALTER TABLE "skill_mcp_integrations" ADD CONSTRAINT "FK_7c3739200eea4db196090483753" FOREIGN KEY ("mcpIntegrationsId") REFERENCES "mcp_integrations"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
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
      `ALTER TABLE "skill_mcp_integrations" DROP CONSTRAINT "FK_7c3739200eea4db196090483753"`,
    );
    await queryRunner.query(
      `ALTER TABLE "skill_mcp_integrations" DROP CONSTRAINT "FK_5e20bd35a8dd2f5ad401c58c421"`,
    );
    await queryRunner.query(
      `ALTER TABLE "skill_sources" DROP CONSTRAINT "FK_211656269c7c7b333635bc12585"`,
    );
    await queryRunner.query(
      `ALTER TABLE "skill_sources" DROP CONSTRAINT "FK_c0a68476f77289d586efb303a48"`,
    );
    await queryRunner.query(
      `ALTER TABLE "skills" DROP CONSTRAINT "FK_ee1265e76ea0b8c5f7daa85e817"`,
    );
    // Delete rows with new enum values before recreating old enum to prevent cast failure
    await queryRunner.query(
      `DELETE FROM "agent_tools" WHERE "toolType" IN ('activate_skill', 'create_skill')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."agent_tools_tooltype_enum_old" AS ENUM('http', 'source_query', 'source_get_text', 'internet_search', 'website_content', 'send_email', 'create_calendar_event', 'code_execution', 'bar_chart', 'line_chart', 'pie_chart', 'mcp_tool', 'mcp_resource', 'mcp_prompt', 'product_knowledge')`,
    );
    await queryRunner.query(
      `ALTER TABLE "agent_tools" ALTER COLUMN "toolType" TYPE "public"."agent_tools_tooltype_enum_old" USING "toolType"::"text"::"public"."agent_tools_tooltype_enum_old"`,
    );
    await queryRunner.query(`DROP TYPE "public"."agent_tools_tooltype_enum"`);
    await queryRunner.query(
      `ALTER TYPE "public"."agent_tools_tooltype_enum_old" RENAME TO "agent_tools_tooltype_enum"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_478a802ec5779955baa946f1af"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_b7592fd90ca07215a7586a6018"`,
    );
    await queryRunner.query(`DROP TABLE "thread_mcp_integrations"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_7c3739200eea4db19609048375"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_5e20bd35a8dd2f5ad401c58c42"`,
    );
    await queryRunner.query(`DROP TABLE "skill_mcp_integrations"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_211656269c7c7b333635bc1258"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_c0a68476f77289d586efb303a4"`,
    );
    await queryRunner.query(`DROP TABLE "skill_sources"`);
    await queryRunner.query(`DROP TABLE "skills"`);
  }
}
