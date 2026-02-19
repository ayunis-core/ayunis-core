import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddShares1763629372306 implements MigrationInterface {
  name = 'AddShares1763629372306';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."share_scopes_scope_type_enum" AS ENUM('org', 'user')`,
    );
    await queryRunner.query(
      `CREATE TABLE "share_scopes" ("id" character varying NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "scope_type" "public"."share_scopes_scope_type_enum" NOT NULL, CONSTRAINT "PK_37f19f2043cfbcbd32e1f2f2058" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_63beedf9d70af84c2db055dcd5" ON "share_scopes" ("scope_type") `,
    );
    await queryRunner.query(
      `CREATE TABLE "shares" ("id" character varying NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "owner_id" character varying NOT NULL, "agent_id" character varying, "entity_type" character varying NOT NULL, "scope_id" character varying, CONSTRAINT "PK_b88473409066c43c2ccb1894a82" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_a8f5a2a6422644695744efc882" ON "shares" ("entity_type") `,
    );
    await queryRunner.query(
      `ALTER TYPE "public"."agent_tools_tooltype_enum" RENAME TO "agent_tools_tooltype_enum_old"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."agent_tools_tooltype_enum" AS ENUM('http', 'source_query', 'internet_search', 'website_content', 'send_email', 'create_calendar_event', 'code_execution', 'bar_chart', 'line_chart', 'pie_chart', 'mcp_tool', 'mcp_resource', 'mcp_prompt')`,
    );
    await queryRunner.query(
      `ALTER TABLE "agent_tools" ALTER COLUMN "toolType" TYPE "public"."agent_tools_tooltype_enum" USING "toolType"::"text"::"public"."agent_tools_tooltype_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE "public"."agent_tools_tooltype_enum_old"`,
    );
    await queryRunner.query(
      `ALTER TABLE "shares" ADD CONSTRAINT "FK_adc3637e31eabc1b8cb3df5c27b" FOREIGN KEY ("scope_id") REFERENCES "share_scopes"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "shares" ADD CONSTRAINT "FK_394b8d90a8d4717d5f5cdf543c7" FOREIGN KEY ("agent_id") REFERENCES "agents"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "shares" DROP CONSTRAINT "FK_394b8d90a8d4717d5f5cdf543c7"`,
    );
    await queryRunner.query(
      `ALTER TABLE "shares" DROP CONSTRAINT "FK_adc3637e31eabc1b8cb3df5c27b"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."agent_tools_tooltype_enum_old" AS ENUM('http', 'source_query', 'internet_search', 'website_content', 'send_email', 'create_calendar_event', 'code_execution')`,
    );
    await queryRunner.query(
      `ALTER TABLE "agent_tools" ALTER COLUMN "toolType" TYPE "public"."agent_tools_tooltype_enum_old" USING "toolType"::"text"::"public"."agent_tools_tooltype_enum_old"`,
    );
    await queryRunner.query(`DROP TYPE "public"."agent_tools_tooltype_enum"`);
    await queryRunner.query(
      `ALTER TYPE "public"."agent_tools_tooltype_enum_old" RENAME TO "agent_tools_tooltype_enum"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_a8f5a2a6422644695744efc882"`,
    );
    await queryRunner.query(`DROP TABLE "shares"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_63beedf9d70af84c2db055dcd5"`,
    );
    await queryRunner.query(`DROP TABLE "share_scopes"`);
    await queryRunner.query(
      `DROP TYPE "public"."share_scopes_scope_type_enum"`,
    );
  }
}
