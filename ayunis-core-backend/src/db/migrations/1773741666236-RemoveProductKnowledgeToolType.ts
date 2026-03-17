import type { MigrationInterface, QueryRunner } from 'typeorm';

export class RemoveProductKnowledgeToolType1773741666236 implements MigrationInterface {
  name = 'RemoveProductKnowledgeToolType1773741666236';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TYPE "public"."agent_tools_tooltype_enum" RENAME TO "agent_tools_tooltype_enum_old"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."agent_tools_tooltype_enum" AS ENUM('http', 'source_query', 'source_get_text', 'internet_search', 'website_content', 'send_email', 'create_calendar_event', 'code_execution', 'bar_chart', 'line_chart', 'pie_chart', 'mcp_tool', 'mcp_resource', 'mcp_prompt', 'activate_skill', 'create_skill', 'knowledge_query', 'knowledge_get_text', 'create_document', 'update_document', 'edit_document')`,
    );
    await queryRunner.query(
      `ALTER TABLE "agent_tools" ALTER COLUMN "toolType" TYPE "public"."agent_tools_tooltype_enum" USING "toolType"::"text"::"public"."agent_tools_tooltype_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE "public"."agent_tools_tooltype_enum_old"`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."agent_tools_tooltype_enum_old" AS ENUM('activate_skill', 'bar_chart', 'code_execution', 'create_calendar_event', 'create_document', 'create_skill', 'edit_document', 'http', 'internet_search', 'knowledge_get_text', 'knowledge_query', 'line_chart', 'mcp_prompt', 'mcp_resource', 'mcp_tool', 'pie_chart', 'product_knowledge', 'send_email', 'source_get_text', 'source_query', 'update_document', 'website_content')`,
    );
    await queryRunner.query(
      `ALTER TABLE "agent_tools" ALTER COLUMN "toolType" TYPE "public"."agent_tools_tooltype_enum_old" USING "toolType"::"text"::"public"."agent_tools_tooltype_enum_old"`,
    );
    await queryRunner.query(`DROP TYPE "public"."agent_tools_tooltype_enum"`);
    await queryRunner.query(
      `ALTER TYPE "public"."agent_tools_tooltype_enum_old" RENAME TO "agent_tools_tooltype_enum"`,
    );
  }
}
