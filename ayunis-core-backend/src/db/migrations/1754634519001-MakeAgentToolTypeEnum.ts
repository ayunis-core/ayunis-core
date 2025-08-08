import { MigrationInterface, QueryRunner } from "typeorm";

export class MakeAgentToolTypeEnum1754634519001 implements MigrationInterface {
    name = 'MakeAgentToolTypeEnum1754634519001'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TYPE "public"."agent_tools_tooltype_enum" RENAME TO "agent_tools_tooltype_enum_old"`);
        await queryRunner.query(`CREATE TYPE "public"."agent_tools_tooltype_enum" AS ENUM('http', 'source_query', 'internet_search', 'website_content')`);
        await queryRunner.query(`ALTER TABLE "agent_tools" ALTER COLUMN "toolType" TYPE "public"."agent_tools_tooltype_enum" USING "toolType"::"text"::"public"."agent_tools_tooltype_enum"`);
        await queryRunner.query(`DROP TYPE "public"."agent_tools_tooltype_enum_old"`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."agent_tools_tooltype_enum_old" AS ENUM('http', 'source_query', 'internet_search', 'website_content', 'custom')`);
        await queryRunner.query(`ALTER TABLE "agent_tools" ALTER COLUMN "toolType" TYPE "public"."agent_tools_tooltype_enum_old" USING "toolType"::"text"::"public"."agent_tools_tooltype_enum_old"`);
        await queryRunner.query(`DROP TYPE "public"."agent_tools_tooltype_enum"`);
        await queryRunner.query(`ALTER TYPE "public"."agent_tools_tooltype_enum_old" RENAME TO "agent_tools_tooltype_enum"`);
    }

}
