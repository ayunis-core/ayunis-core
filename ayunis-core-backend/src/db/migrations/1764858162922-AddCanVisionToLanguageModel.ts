import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCanVisionToLanguageModel1764858162922
  implements MigrationInterface
{
  name = 'AddCanVisionToLanguageModel1764858162922';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "models" ADD "canVision" boolean DEFAULT false`,
    );
    await queryRunner.query(
      `ALTER TYPE "public"."agent_tools_tooltype_enum" RENAME TO "agent_tools_tooltype_enum_old"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."agent_tools_tooltype_enum" AS ENUM('http', 'source_query', 'internet_search', 'website_content', 'send_email', 'create_calendar_event', 'code_execution', 'bar_chart', 'line_chart', 'pie_chart', 'mcp_tool', 'mcp_resource', 'mcp_prompt', 'product_knowledge')`,
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
      `CREATE TYPE "public"."agent_tools_tooltype_enum_old" AS ENUM('http', 'source_query', 'internet_search', 'website_content', 'send_email', 'create_calendar_event', 'code_execution', 'bar_chart', 'line_chart', 'pie_chart', 'mcp_tool', 'mcp_resource', 'mcp_prompt')`,
    );
    await queryRunner.query(
      `ALTER TABLE "agent_tools" ALTER COLUMN "toolType" TYPE "public"."agent_tools_tooltype_enum_old" USING "toolType"::"text"::"public"."agent_tools_tooltype_enum_old"`,
    );
    await queryRunner.query(`DROP TYPE "public"."agent_tools_tooltype_enum"`);
    await queryRunner.query(
      `ALTER TYPE "public"."agent_tools_tooltype_enum_old" RENAME TO "agent_tools_tooltype_enum"`,
    );
    await queryRunner.query(`ALTER TABLE "models" DROP COLUMN "canVision"`);
  }
}
