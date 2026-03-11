import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateArtifactsTables1771487387818 implements MigrationInterface {
  name = 'CreateArtifactsTables1771487387818';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "artifact_versions" ("id" character varying NOT NULL, "artifactId" character varying NOT NULL, "versionNumber" integer NOT NULL, "content" text NOT NULL, "authorType" character varying NOT NULL, "authorId" uuid, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_62eb900d5d5094f96e73ca41884" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_22532be5f15d8edc71b11e1c7b" ON "artifact_versions" ("artifactId") `,
    );
    await queryRunner.query(
      `CREATE TABLE "artifacts" ("id" character varying NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "threadId" character varying NOT NULL, "userId" character varying NOT NULL, "title" character varying NOT NULL, "currentVersionNumber" integer NOT NULL DEFAULT '1', CONSTRAINT "PK_6516bbed3c129918e05c5012edb" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_551c174f02d20652f95ec0836f" ON "artifacts" ("threadId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_2e3cf9c3366ecc0433c0af146c" ON "artifacts" ("userId") `,
    );
    await queryRunner.query(
      `ALTER TYPE "public"."agent_tools_tooltype_enum" RENAME TO "agent_tools_tooltype_enum_old"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."agent_tools_tooltype_enum" AS ENUM('http', 'source_query', 'source_get_text', 'internet_search', 'website_content', 'send_email', 'create_calendar_event', 'code_execution', 'bar_chart', 'line_chart', 'pie_chart', 'mcp_tool', 'mcp_resource', 'mcp_prompt', 'product_knowledge', 'activate_skill', 'create_skill', 'create_document', 'update_document')`,
    );
    await queryRunner.query(
      `ALTER TABLE "agent_tools" ALTER COLUMN "toolType" TYPE "public"."agent_tools_tooltype_enum" USING "toolType"::"text"::"public"."agent_tools_tooltype_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE "public"."agent_tools_tooltype_enum_old"`,
    );
    await queryRunner.query(
      `ALTER TABLE "artifact_versions" ADD CONSTRAINT "FK_22532be5f15d8edc71b11e1c7b2" FOREIGN KEY ("artifactId") REFERENCES "artifacts"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "artifacts" ADD CONSTRAINT "FK_551c174f02d20652f95ec0836f7" FOREIGN KEY ("threadId") REFERENCES "threads"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "artifacts" DROP CONSTRAINT "FK_551c174f02d20652f95ec0836f7"`,
    );
    await queryRunner.query(
      `ALTER TABLE "artifact_versions" DROP CONSTRAINT "FK_22532be5f15d8edc71b11e1c7b2"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."agent_tools_tooltype_enum_old" AS ENUM('activate_skill', 'bar_chart', 'code_execution', 'create_calendar_event', 'create_skill', 'http', 'internet_search', 'line_chart', 'mcp_prompt', 'mcp_resource', 'mcp_tool', 'pie_chart', 'product_knowledge', 'send_email', 'source_get_text', 'source_query', 'website_content')`,
    );
    await queryRunner.query(
      `ALTER TABLE "agent_tools" ALTER COLUMN "toolType" TYPE "public"."agent_tools_tooltype_enum_old" USING "toolType"::"text"::"public"."agent_tools_tooltype_enum_old"`,
    );
    await queryRunner.query(`DROP TYPE "public"."agent_tools_tooltype_enum"`);
    await queryRunner.query(
      `ALTER TYPE "public"."agent_tools_tooltype_enum_old" RENAME TO "agent_tools_tooltype_enum"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_2e3cf9c3366ecc0433c0af146c"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_551c174f02d20652f95ec0836f"`,
    );
    await queryRunner.query(`DROP TABLE "artifacts"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_22532be5f15d8edc71b11e1c7b"`,
    );
    await queryRunner.query(`DROP TABLE "artifact_versions"`);
  }
}
