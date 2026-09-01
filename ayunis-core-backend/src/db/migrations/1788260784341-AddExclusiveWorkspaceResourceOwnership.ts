import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddExclusiveWorkspaceResourceOwnership1788260784341 implements MigrationInterface {
  name = 'AddExclusiveWorkspaceResourceOwnership1788260784341';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "skills" DROP CONSTRAINT "UQ_skill_name_userId"`,
    );
    await queryRunner.query(
      `ALTER TABLE "knowledge_bases" ADD "workspaceId" character varying`,
    );
    await queryRunner.query(
      `ALTER TABLE "knowledge_bases" ADD "originKnowledgeBaseId" character varying`,
    );
    await queryRunner.query(
      `ALTER TABLE "knowledge_bases" ADD "version" integer NOT NULL DEFAULT '1'`,
    );
    await queryRunner.query(
      `ALTER TABLE "knowledge_bases" ADD "importedOriginVersion" integer`,
    );
    await queryRunner.query(
      `ALTER TABLE "knowledge_bases" ADD "dismissedOriginVersion" integer`,
    );
    await queryRunner.query(
      `ALTER TABLE "skills" ADD "workspaceId" character varying`,
    );
    await queryRunner.query(
      `ALTER TABLE "skills" ADD "originSkillId" character varying`,
    );
    await queryRunner.query(
      `ALTER TABLE "skills" ADD "version" integer NOT NULL DEFAULT '1'`,
    );
    await queryRunner.query(
      `ALTER TABLE "skills" ADD "importedOriginVersion" integer`,
    );
    await queryRunner.query(
      `ALTER TABLE "skills" ADD "dismissedOriginVersion" integer`,
    );
    await queryRunner.query(
      `ALTER TABLE "knowledge_bases" DROP CONSTRAINT "FK_e7f0bbc4c652f1c9146114c1b46"`,
    );
    await queryRunner.query(
      `ALTER TABLE "knowledge_bases" ALTER COLUMN "userId" DROP NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "skills" DROP CONSTRAINT "FK_ee1265e76ea0b8c5f7daa85e817"`,
    );
    await queryRunner.query(
      `ALTER TABLE "skills" ALTER COLUMN "userId" DROP NOT NULL`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_eaaf2f88f5909b4d9a5aeac481" ON "knowledge_bases" ("workspaceId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_b67d0e19bd3c8979c2dabd228e" ON "knowledge_bases" ("originKnowledgeBaseId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_5cf36117213eaa4e81b9406f7a" ON "skills" ("workspaceId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_7a408322405d752dc417e60347" ON "skills" ("originSkillId") `,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_e09b96b2366a6bb31c5b470c93" ON "skills" ("name", "workspaceId") WHERE "workspaceId" IS NOT NULL`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_39f83ca53361290cf4364af818" ON "skills" ("name", "userId") WHERE "workspaceId" IS NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "knowledge_bases" ADD CONSTRAINT "CHK_knowledge_bases_exactly_one_owner" CHECK (("userId" IS NOT NULL AND "workspaceId" IS NULL) OR ("userId" IS NULL AND "workspaceId" IS NOT NULL))`,
    );
    await queryRunner.query(
      `ALTER TABLE "skills" ADD CONSTRAINT "CHK_skills_exactly_one_owner" CHECK (("userId" IS NOT NULL AND "workspaceId" IS NULL) OR ("userId" IS NULL AND "workspaceId" IS NOT NULL))`,
    );
    await queryRunner.query(
      `ALTER TABLE "knowledge_bases" ADD CONSTRAINT "FK_e7f0bbc4c652f1c9146114c1b46" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "knowledge_bases" ADD CONSTRAINT "FK_eaaf2f88f5909b4d9a5aeac4811" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "knowledge_bases" ADD CONSTRAINT "FK_b67d0e19bd3c8979c2dabd228e3" FOREIGN KEY ("originKnowledgeBaseId") REFERENCES "knowledge_bases"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "skills" ADD CONSTRAINT "FK_ee1265e76ea0b8c5f7daa85e817" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "skills" ADD CONSTRAINT "FK_5cf36117213eaa4e81b9406f7a7" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "skills" ADD CONSTRAINT "FK_7a408322405d752dc417e60347b" FOREIGN KEY ("originSkillId") REFERENCES "skills"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "skills" DROP CONSTRAINT "FK_7a408322405d752dc417e60347b"`,
    );
    await queryRunner.query(
      `ALTER TABLE "skills" DROP CONSTRAINT "FK_5cf36117213eaa4e81b9406f7a7"`,
    );
    await queryRunner.query(
      `ALTER TABLE "skills" DROP CONSTRAINT "FK_ee1265e76ea0b8c5f7daa85e817"`,
    );
    await queryRunner.query(
      `ALTER TABLE "knowledge_bases" DROP CONSTRAINT "FK_b67d0e19bd3c8979c2dabd228e3"`,
    );
    await queryRunner.query(
      `ALTER TABLE "knowledge_bases" DROP CONSTRAINT "FK_eaaf2f88f5909b4d9a5aeac4811"`,
    );
    await queryRunner.query(
      `ALTER TABLE "knowledge_bases" DROP CONSTRAINT "FK_e7f0bbc4c652f1c9146114c1b46"`,
    );
    await queryRunner.query(
      `ALTER TABLE "skills" DROP CONSTRAINT "CHK_skills_exactly_one_owner"`,
    );
    await queryRunner.query(
      `ALTER TABLE "knowledge_bases" DROP CONSTRAINT "CHK_knowledge_bases_exactly_one_owner"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_39f83ca53361290cf4364af818"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_e09b96b2366a6bb31c5b470c93"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_7a408322405d752dc417e60347"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_5cf36117213eaa4e81b9406f7a"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_b67d0e19bd3c8979c2dabd228e"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_eaaf2f88f5909b4d9a5aeac481"`,
    );
    await queryRunner.query(
      `ALTER TABLE "skills" ALTER COLUMN "userId" SET NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "skills" ADD CONSTRAINT "FK_ee1265e76ea0b8c5f7daa85e817" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "knowledge_bases" ALTER COLUMN "userId" SET NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "knowledge_bases" ADD CONSTRAINT "FK_e7f0bbc4c652f1c9146114c1b46" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "skills" DROP COLUMN "dismissedOriginVersion"`,
    );
    await queryRunner.query(
      `ALTER TABLE "skills" DROP COLUMN "importedOriginVersion"`,
    );
    await queryRunner.query(`ALTER TABLE "skills" DROP COLUMN "version"`);
    await queryRunner.query(`ALTER TABLE "skills" DROP COLUMN "originSkillId"`);
    await queryRunner.query(`ALTER TABLE "skills" DROP COLUMN "workspaceId"`);
    await queryRunner.query(
      `ALTER TABLE "knowledge_bases" DROP COLUMN "dismissedOriginVersion"`,
    );
    await queryRunner.query(
      `ALTER TABLE "knowledge_bases" DROP COLUMN "importedOriginVersion"`,
    );
    await queryRunner.query(
      `ALTER TABLE "knowledge_bases" DROP COLUMN "version"`,
    );
    await queryRunner.query(
      `ALTER TABLE "knowledge_bases" DROP COLUMN "originKnowledgeBaseId"`,
    );
    await queryRunner.query(
      `ALTER TABLE "knowledge_bases" DROP COLUMN "workspaceId"`,
    );
    await queryRunner.query(
      `ALTER TABLE "skills" ADD CONSTRAINT "UQ_skill_name_userId" UNIQUE ("name", "userId")`,
    );
  }
}
