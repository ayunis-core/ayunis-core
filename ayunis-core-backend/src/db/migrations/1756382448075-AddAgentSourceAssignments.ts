import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAgentSourceAssignments1756382448075
  implements MigrationInterface
{
  name = 'AddAgentSourceAssignments1756382448075';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "agent_source_assignments" ("id" character varying NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "agentId" character varying NOT NULL, "sourceId" character varying NOT NULL, CONSTRAINT "PK_33f45feab019a45357d5c27e8ca" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_b338794109a1e6fc6aec714a61" ON "agent_source_assignments" ("agentId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_653f2ce04ba18884e86cbc326a" ON "agent_source_assignments" ("sourceId") `,
    );
    await queryRunner.query(
      `ALTER TYPE "public"."agent_tools_tooltype_enum" RENAME TO "agent_tools_tooltype_enum_old"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."agent_tools_tooltype_enum" AS ENUM('http', 'source_query', 'internet_search', 'website_content', 'send_email')`,
    );
    await queryRunner.query(
      `ALTER TABLE "agent_tools" ALTER COLUMN "toolType" TYPE "public"."agent_tools_tooltype_enum" USING "toolType"::"text"::"public"."agent_tools_tooltype_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE "public"."agent_tools_tooltype_enum_old"`,
    );
    await queryRunner.query(
      `ALTER TABLE "agent_source_assignments" ADD CONSTRAINT "FK_b338794109a1e6fc6aec714a613" FOREIGN KEY ("agentId") REFERENCES "agents"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "agent_source_assignments" ADD CONSTRAINT "FK_653f2ce04ba18884e86cbc326a2" FOREIGN KEY ("sourceId") REFERENCES "sources"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "agent_source_assignments" DROP CONSTRAINT "FK_653f2ce04ba18884e86cbc326a2"`,
    );
    await queryRunner.query(
      `ALTER TABLE "agent_source_assignments" DROP CONSTRAINT "FK_b338794109a1e6fc6aec714a613"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."agent_tools_tooltype_enum_old" AS ENUM('http', 'source_query', 'internet_search', 'website_content')`,
    );
    await queryRunner.query(
      `ALTER TABLE "agent_tools" ALTER COLUMN "toolType" TYPE "public"."agent_tools_tooltype_enum_old" USING "toolType"::"text"::"public"."agent_tools_tooltype_enum_old"`,
    );
    await queryRunner.query(`DROP TYPE "public"."agent_tools_tooltype_enum"`);
    await queryRunner.query(
      `ALTER TYPE "public"."agent_tools_tooltype_enum_old" RENAME TO "agent_tools_tooltype_enum"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_653f2ce04ba18884e86cbc326a"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_b338794109a1e6fc6aec714a61"`,
    );
    await queryRunner.query(`DROP TABLE "agent_source_assignments"`);
  }
}
