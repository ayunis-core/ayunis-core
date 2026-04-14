import { MigrationInterface, QueryRunner } from "typeorm";

export class FixSchemaDrift1776162477472 implements MigrationInterface {
    name = 'FixSchemaDrift1776162477472'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "permitted_models" DROP CONSTRAINT "FK_b6d0e7d1fa9fa0c343b75152f94"`);
        await queryRunner.query(`ALTER TABLE "mcp_integration_user_configs" DROP CONSTRAINT "FK_user_config_integration"`);
        await queryRunner.query(`ALTER TABLE "letterheads" DROP CONSTRAINT "FK_letterheads_orgId_orgs"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_605f8ca2a5a7123c96c2f145a2"`);
        await queryRunner.query(`DROP INDEX "public"."UQ_marketplace_org_identifier"`);
        await queryRunner.query(`ALTER TYPE "public"."agent_tools_tooltype_enum" RENAME TO "agent_tools_tooltype_enum_old"`);
        await queryRunner.query(`CREATE TYPE "public"."agent_tools_tooltype_enum" AS ENUM('http', 'source_query', 'source_get_text', 'internet_search', 'website_content', 'send_email', 'create_calendar_event', 'code_execution', 'bar_chart', 'line_chart', 'pie_chart', 'mcp_tool', 'mcp_resource', 'mcp_prompt', 'activate_skill', 'create_skill', 'knowledge_query', 'knowledge_get_text', 'create_document', 'update_document', 'edit_document', 'read_document')`);
        await queryRunner.query(`ALTER TABLE "agent_tools" ALTER COLUMN "toolType" TYPE "public"."agent_tools_tooltype_enum" USING "toolType"::"text"::"public"."agent_tools_tooltype_enum"`);
        await queryRunner.query(`DROP TYPE "public"."agent_tools_tooltype_enum_old"`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_2d4c91a8c18766bbbcba842d07" ON "permitted_models" ("scope_id", "modelId") WHERE "scope" = 'team'`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_63afa79e56fd0523bc7f8f1a30" ON "mcp_integrations" ("orgId", "marketplace_identifier") WHERE "marketplace_identifier" IS NOT NULL`);
        await queryRunner.query(`CREATE INDEX "IDX_d5214d1c8a5cb55639fc05e33a" ON "skill_templates" ("distributionMode") `);
        await queryRunner.query(`ALTER TABLE "permitted_models" ADD CONSTRAINT "FK_67e70e76f8ac05331cc49032517" FOREIGN KEY ("scope_id") REFERENCES "teams"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "mcp_integration_user_configs" ADD CONSTRAINT "FK_d3a56555dd20f2c0af66c10959c" FOREIGN KEY ("integration_id") REFERENCES "mcp_integrations"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "letterheads" ADD CONSTRAINT "FK_ed5c8c0b59525d6ee217b5e2714" FOREIGN KEY ("orgId") REFERENCES "orgs"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "letterheads" DROP CONSTRAINT "FK_ed5c8c0b59525d6ee217b5e2714"`);
        await queryRunner.query(`ALTER TABLE "mcp_integration_user_configs" DROP CONSTRAINT "FK_d3a56555dd20f2c0af66c10959c"`);
        await queryRunner.query(`ALTER TABLE "permitted_models" DROP CONSTRAINT "FK_67e70e76f8ac05331cc49032517"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_d5214d1c8a5cb55639fc05e33a"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_63afa79e56fd0523bc7f8f1a30"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_2d4c91a8c18766bbbcba842d07"`);
        await queryRunner.query(`CREATE TYPE "public"."agent_tools_tooltype_enum_old" AS ENUM('activate_skill', 'bar_chart', 'code_execution', 'create_calendar_event', 'create_document', 'create_skill', 'edit_document', 'http', 'internet_search', 'knowledge_get_text', 'knowledge_query', 'line_chart', 'mcp_prompt', 'mcp_resource', 'mcp_tool', 'pie_chart', 'send_email', 'source_get_text', 'source_query', 'update_document', 'website_content')`);
        await queryRunner.query(`ALTER TABLE "agent_tools" ALTER COLUMN "toolType" TYPE "public"."agent_tools_tooltype_enum_old" USING "toolType"::"text"::"public"."agent_tools_tooltype_enum_old"`);
        await queryRunner.query(`DROP TYPE "public"."agent_tools_tooltype_enum"`);
        await queryRunner.query(`ALTER TYPE "public"."agent_tools_tooltype_enum_old" RENAME TO "agent_tools_tooltype_enum"`);
        await queryRunner.query(`CREATE UNIQUE INDEX "UQ_marketplace_org_identifier" ON "mcp_integrations" ("orgId", "marketplace_identifier") WHERE (marketplace_identifier IS NOT NULL)`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_605f8ca2a5a7123c96c2f145a2" ON "permitted_models" ("modelId", "scope_id") WHERE (scope = 'team'::permitted_models_scope_enum)`);
        await queryRunner.query(`ALTER TABLE "letterheads" ADD CONSTRAINT "FK_letterheads_orgId_orgs" FOREIGN KEY ("orgId") REFERENCES "orgs"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "mcp_integration_user_configs" ADD CONSTRAINT "FK_user_config_integration" FOREIGN KEY ("integration_id") REFERENCES "mcp_integrations"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "permitted_models" ADD CONSTRAINT "FK_b6d0e7d1fa9fa0c343b75152f94" FOREIGN KEY ("scope_id") REFERENCES "teams"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

}
