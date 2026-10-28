import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddWorkspaceContextAssignments1786649398174 implements MigrationInterface {
  name = 'AddWorkspaceContextAssignments1786649398174';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "workspace_source_assignments" ("id" character varying NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "workspaceId" character varying NOT NULL, "sourceId" character varying NOT NULL, CONSTRAINT "UQ_e6ea90491e8e2c3081c9e02ef99" UNIQUE ("workspaceId", "sourceId"), CONSTRAINT "PK_9dfa799d1b5b4cc0bde7d966c2c" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_e602a51a07600b9fe15184672c" ON "workspace_source_assignments" ("workspaceId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_10545836d90a5593b3bed3896f" ON "workspace_source_assignments" ("sourceId") `,
    );
    await queryRunner.query(
      `CREATE TABLE "workspace_skill_assignments" ("id" character varying NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "workspaceId" character varying NOT NULL, "skillId" character varying NOT NULL, CONSTRAINT "UQ_9fadba3515e9dcbf90515eacc25" UNIQUE ("workspaceId", "skillId"), CONSTRAINT "PK_489894de8d18c08c99f5130a605" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_1916a377d1de896630e305779a" ON "workspace_skill_assignments" ("workspaceId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_741632413d27ff112b7776b3f8" ON "workspace_skill_assignments" ("skillId") `,
    );
    await queryRunner.query(
      `CREATE TABLE "workspace_knowledge_base_assignments" ("id" character varying NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "workspaceId" character varying NOT NULL, "knowledgeBaseId" character varying NOT NULL, CONSTRAINT "UQ_c63cf835205cea3dddefc1bb52a" UNIQUE ("workspaceId", "knowledgeBaseId"), CONSTRAINT "PK_02ed08a684c925d5d886e83d1ea" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_d8e63bf51231a234484d61b401" ON "workspace_knowledge_base_assignments" ("workspaceId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_c372faa720d58488c12396afbb" ON "workspace_knowledge_base_assignments" ("knowledgeBaseId") `,
    );
    await queryRunner.query(`ALTER TABLE "workspaces" ADD "instruction" text`);
    await queryRunner.query(
      `ALTER TABLE "workspace_source_assignments" ADD CONSTRAINT "FK_e602a51a07600b9fe15184672c3" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "workspace_source_assignments" ADD CONSTRAINT "FK_10545836d90a5593b3bed3896fd" FOREIGN KEY ("sourceId") REFERENCES "sources"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "workspace_skill_assignments" ADD CONSTRAINT "FK_1916a377d1de896630e305779aa" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "workspace_skill_assignments" ADD CONSTRAINT "FK_741632413d27ff112b7776b3f8d" FOREIGN KEY ("skillId") REFERENCES "skills"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "workspace_knowledge_base_assignments" ADD CONSTRAINT "FK_d8e63bf51231a234484d61b4015" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "workspace_knowledge_base_assignments" ADD CONSTRAINT "FK_c372faa720d58488c12396afbb1" FOREIGN KEY ("knowledgeBaseId") REFERENCES "knowledge_bases"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "workspace_knowledge_base_assignments" DROP CONSTRAINT "FK_c372faa720d58488c12396afbb1"`,
    );
    await queryRunner.query(
      `ALTER TABLE "workspace_knowledge_base_assignments" DROP CONSTRAINT "FK_d8e63bf51231a234484d61b4015"`,
    );
    await queryRunner.query(
      `ALTER TABLE "workspace_skill_assignments" DROP CONSTRAINT "FK_741632413d27ff112b7776b3f8d"`,
    );
    await queryRunner.query(
      `ALTER TABLE "workspace_skill_assignments" DROP CONSTRAINT "FK_1916a377d1de896630e305779aa"`,
    );
    await queryRunner.query(
      `ALTER TABLE "workspace_source_assignments" DROP CONSTRAINT "FK_10545836d90a5593b3bed3896fd"`,
    );
    await queryRunner.query(
      `ALTER TABLE "workspace_source_assignments" DROP CONSTRAINT "FK_e602a51a07600b9fe15184672c3"`,
    );
    await queryRunner.query(
      `ALTER TABLE "workspaces" DROP COLUMN "instruction"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_c372faa720d58488c12396afbb"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_d8e63bf51231a234484d61b401"`,
    );
    await queryRunner.query(
      `DROP TABLE "workspace_knowledge_base_assignments"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_741632413d27ff112b7776b3f8"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_1916a377d1de896630e305779a"`,
    );
    await queryRunner.query(`DROP TABLE "workspace_skill_assignments"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_10545836d90a5593b3bed3896f"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_e602a51a07600b9fe15184672c"`,
    );
    await queryRunner.query(`DROP TABLE "workspace_source_assignments"`);
  }
}
