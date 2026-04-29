import { MigrationInterface, QueryRunner } from "typeorm";

export class AddFairUseImagesQuotaType1777448937554 implements MigrationInterface {
    name = 'AddFairUseImagesQuotaType1777448937554'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TYPE "public"."agent_tools_tooltype_enum" RENAME TO "agent_tools_tooltype_enum_old"`);
        await queryRunner.query(`CREATE TYPE "public"."agent_tools_tooltype_enum" AS ENUM('http', 'source_query', 'source_get_text', 'internet_search', 'website_content', 'send_email', 'create_calendar_event', 'code_execution', 'bar_chart', 'line_chart', 'pie_chart', 'mcp_tool', 'mcp_resource', 'mcp_prompt', 'activate_skill', 'create_skill', 'edit_skill', 'knowledge_query', 'knowledge_get_text', 'create_document', 'update_document', 'edit_document', 'read_document', 'generate_image', 'create_diagram', 'update_diagram')`);
        await queryRunner.query(`ALTER TABLE "agent_tools" ALTER COLUMN "toolType" TYPE "public"."agent_tools_tooltype_enum" USING "toolType"::"text"::"public"."agent_tools_tooltype_enum"`);
        await queryRunner.query(`DROP TYPE "public"."agent_tools_tooltype_enum_old"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_394fe814ce4a600f6a08311199"`);
        await queryRunner.query(`ALTER TABLE "usage_quotas" DROP CONSTRAINT "UQ_394fe814ce4a600f6a083111998"`);
        await queryRunner.query(`ALTER TYPE "public"."usage_quotas_quotatype_enum" RENAME TO "usage_quotas_quotatype_enum_old"`);
        await queryRunner.query(`CREATE TYPE "public"."usage_quotas_quotatype_enum" AS ENUM('FAIR_USE_MESSAGES_LOW', 'FAIR_USE_MESSAGES_MEDIUM', 'FAIR_USE_MESSAGES_HIGH', 'FAIR_USE_IMAGES')`);
        await queryRunner.query(`ALTER TABLE "usage_quotas" ALTER COLUMN "quotaType" TYPE "public"."usage_quotas_quotatype_enum" USING "quotaType"::"text"::"public"."usage_quotas_quotatype_enum"`);
        await queryRunner.query(`DROP TYPE "public"."usage_quotas_quotatype_enum_old"`);
        await queryRunner.query(`CREATE INDEX "IDX_394fe814ce4a600f6a08311199" ON "usage_quotas" ("userId", "quotaType") `);
        await queryRunner.query(`ALTER TABLE "usage_quotas" ADD CONSTRAINT "UQ_394fe814ce4a600f6a083111998" UNIQUE ("userId", "quotaType")`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "usage_quotas" DROP CONSTRAINT "UQ_394fe814ce4a600f6a083111998"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_394fe814ce4a600f6a08311199"`);
        await queryRunner.query(`DELETE FROM "usage_quotas" WHERE "quotaType" = 'FAIR_USE_IMAGES'`);
        await queryRunner.query(`CREATE TYPE "public"."usage_quotas_quotatype_enum_old" AS ENUM('FAIR_USE_MESSAGES_HIGH', 'FAIR_USE_MESSAGES_LOW', 'FAIR_USE_MESSAGES_MEDIUM')`);
        await queryRunner.query(`ALTER TABLE "usage_quotas" ALTER COLUMN "quotaType" TYPE "public"."usage_quotas_quotatype_enum_old" USING "quotaType"::"text"::"public"."usage_quotas_quotatype_enum_old"`);
        await queryRunner.query(`DROP TYPE "public"."usage_quotas_quotatype_enum"`);
        await queryRunner.query(`ALTER TYPE "public"."usage_quotas_quotatype_enum_old" RENAME TO "usage_quotas_quotatype_enum"`);
        await queryRunner.query(`ALTER TABLE "usage_quotas" ADD CONSTRAINT "UQ_394fe814ce4a600f6a083111998" UNIQUE ("userId", "quotaType")`);
        await queryRunner.query(`CREATE INDEX "IDX_394fe814ce4a600f6a08311199" ON "usage_quotas" ("userId", "quotaType") `);
        await queryRunner.query(`DELETE FROM "agent_tools" WHERE "toolType" IN ('create_diagram', 'update_diagram')`);
        await queryRunner.query(`CREATE TYPE "public"."agent_tools_tooltype_enum_old" AS ENUM('http', 'source_query', 'source_get_text', 'internet_search', 'website_content', 'send_email', 'create_calendar_event', 'code_execution', 'bar_chart', 'line_chart', 'pie_chart', 'mcp_tool', 'mcp_resource', 'mcp_prompt', 'activate_skill', 'create_skill', 'edit_skill', 'knowledge_query', 'knowledge_get_text', 'create_document', 'update_document', 'edit_document', 'read_document', 'generate_image')`);
        await queryRunner.query(`ALTER TABLE "agent_tools" ALTER COLUMN "toolType" TYPE "public"."agent_tools_tooltype_enum_old" USING "toolType"::"text"::"public"."agent_tools_tooltype_enum_old"`);
        await queryRunner.query(`DROP TYPE "public"."agent_tools_tooltype_enum"`);
        await queryRunner.query(`ALTER TYPE "public"."agent_tools_tooltype_enum_old" RENAME TO "agent_tools_tooltype_enum"`);
    }

}
