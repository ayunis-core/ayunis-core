import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddWorkspaceLinks1792071930512 implements MigrationInterface {
  name = 'AddWorkspaceLinks1792071930512';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "workspace_skill_links" ("id" uuid NOT NULL, "workspaceId" character varying NOT NULL, "skillId" character varying NOT NULL, "linkedByUserId" character varying, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_1746e242934159fd3224c927736" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_57e6e30453462ae87c52b79fda" ON "workspace_skill_links" ("skillId") `,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_workspace_skill_links_workspace_skill" ON "workspace_skill_links" ("workspaceId", "skillId") `,
    );
    await queryRunner.query(
      `CREATE TABLE "workspace_knowledge_base_links" ("id" uuid NOT NULL, "workspaceId" character varying NOT NULL, "knowledgeBaseId" character varying NOT NULL, "linkedByUserId" character varying, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_767e4d7f12092c6d565509a30a3" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_13fd778aa2d5171784a36633ee" ON "workspace_knowledge_base_links" ("knowledgeBaseId") `,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_workspace_knowledge_base_links_workspace_knowledge_base" ON "workspace_knowledge_base_links" ("workspaceId", "knowledgeBaseId") `,
    );
    await queryRunner.query(
      `ALTER TABLE "workspace_skill_links" ADD CONSTRAINT "FK_1abeb2fc1995c40d6ba8daeb602" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "workspace_skill_links" ADD CONSTRAINT "FK_57e6e30453462ae87c52b79fdad" FOREIGN KEY ("skillId") REFERENCES "skills"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "workspace_skill_links" ADD CONSTRAINT "FK_4f4ba457c9cb99e52fed2068594" FOREIGN KEY ("linkedByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "workspace_knowledge_base_links" ADD CONSTRAINT "FK_eb91f5782ebd574ce15932c72cb" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "workspace_knowledge_base_links" ADD CONSTRAINT "FK_13fd778aa2d5171784a36633ee0" FOREIGN KEY ("knowledgeBaseId") REFERENCES "knowledge_bases"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "workspace_knowledge_base_links" ADD CONSTRAINT "FK_bf4d9c4a4d61fcb43c598764ab1" FOREIGN KEY ("linkedByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "workspace_knowledge_base_links" DROP CONSTRAINT "FK_bf4d9c4a4d61fcb43c598764ab1"`,
    );
    await queryRunner.query(
      `ALTER TABLE "workspace_knowledge_base_links" DROP CONSTRAINT "FK_13fd778aa2d5171784a36633ee0"`,
    );
    await queryRunner.query(
      `ALTER TABLE "workspace_knowledge_base_links" DROP CONSTRAINT "FK_eb91f5782ebd574ce15932c72cb"`,
    );
    await queryRunner.query(
      `ALTER TABLE "workspace_skill_links" DROP CONSTRAINT "FK_4f4ba457c9cb99e52fed2068594"`,
    );
    await queryRunner.query(
      `ALTER TABLE "workspace_skill_links" DROP CONSTRAINT "FK_57e6e30453462ae87c52b79fdad"`,
    );
    await queryRunner.query(
      `ALTER TABLE "workspace_skill_links" DROP CONSTRAINT "FK_1abeb2fc1995c40d6ba8daeb602"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."UQ_workspace_knowledge_base_links_workspace_knowledge_base"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_13fd778aa2d5171784a36633ee"`,
    );
    await queryRunner.query(`DROP TABLE "workspace_knowledge_base_links"`);
    await queryRunner.query(
      `DROP INDEX "public"."UQ_workspace_skill_links_workspace_skill"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_57e6e30453462ae87c52b79fda"`,
    );
    await queryRunner.query(`DROP TABLE "workspace_skill_links"`);
  }
}
