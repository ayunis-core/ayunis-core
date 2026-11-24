import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddInternetAccessAndKnowledgeBasesToRoutines1795519377696 implements MigrationInterface {
  name = 'AddInternetAccessAndKnowledgeBasesToRoutines1795519377696';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "routine_knowledge_bases" ("routinesId" character varying NOT NULL, "knowledgeBasesId" character varying NOT NULL, CONSTRAINT "PK_c50b7f1ab1806ed8499bf4af1f4" PRIMARY KEY ("routinesId", "knowledgeBasesId"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_9c8ef2f8f3148c60e26b930985" ON "routine_knowledge_bases" ("routinesId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_7ccc09fc6e687def896fbb7cea" ON "routine_knowledge_bases" ("knowledgeBasesId") `,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."routines_internetaccess_enum" AS ENUM('off', 'all', 'allowlist')`,
    );
    await queryRunner.query(
      `ALTER TABLE "routines" ADD "internetAccess" "public"."routines_internetaccess_enum" NOT NULL DEFAULT 'off'`,
    );
    await queryRunner.query(
      `ALTER TABLE "routines" ADD "allowedDomains" character varying(253) array NOT NULL DEFAULT '{}'`,
    );
    await queryRunner.query(
      `ALTER TABLE "routine_knowledge_bases" ADD CONSTRAINT "FK_9c8ef2f8f3148c60e26b9309854" FOREIGN KEY ("routinesId") REFERENCES "routines"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
    );
    await queryRunner.query(
      `ALTER TABLE "routine_knowledge_bases" ADD CONSTRAINT "FK_7ccc09fc6e687def896fbb7cea5" FOREIGN KEY ("knowledgeBasesId") REFERENCES "knowledge_bases"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "routine_knowledge_bases" DROP CONSTRAINT "FK_7ccc09fc6e687def896fbb7cea5"`,
    );
    await queryRunner.query(
      `ALTER TABLE "routine_knowledge_bases" DROP CONSTRAINT "FK_9c8ef2f8f3148c60e26b9309854"`,
    );
    await queryRunner.query(
      `ALTER TABLE "routines" DROP COLUMN "allowedDomains"`,
    );
    await queryRunner.query(
      `ALTER TABLE "routines" DROP COLUMN "internetAccess"`,
    );
    await queryRunner.query(
      `DROP TYPE "public"."routines_internetaccess_enum"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_7ccc09fc6e687def896fbb7cea"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_9c8ef2f8f3148c60e26b930985"`,
    );
    await queryRunner.query(`DROP TABLE "routine_knowledge_bases"`);
  }
}
