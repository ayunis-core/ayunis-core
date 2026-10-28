import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddExclusiveWorkspaceResourceOwnership1788271772531 implements MigrationInterface {
  name = 'AddExclusiveWorkspaceResourceOwnership1788271772531';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "skills" DROP CONSTRAINT "UQ_skill_name_userId"`,
    );
    await queryRunner.query(
      `ALTER TABLE "knowledge_bases" ADD "workspaceId" character varying`,
    );
    await queryRunner.query(
      `ALTER TABLE "skills" ADD "workspaceId" character varying`,
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
      `ALTER TABLE "skill_activations" DROP CONSTRAINT "UQ_skill_activation_skillId_userId"`,
    );
    await queryRunner.query(
      `ALTER TABLE "skill_activations" DROP CONSTRAINT "FK_8caf15dc7766481cd4197e566f8"`,
    );
    await queryRunner.query(
      `ALTER TABLE "skill_activations" ALTER COLUMN "userId" DROP NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "skill_activations" ADD "workspaceId" character varying`,
    );
    await queryRunner.query(
      `ALTER TABLE "knowledge_base_activations" DROP CONSTRAINT "UQ_0a3958c4d093b81e24bb0d5a71d"`,
    );
    await queryRunner.query(
      `ALTER TABLE "knowledge_base_activations" DROP CONSTRAINT "FK_24ccd5ff78be47e2d204e180e9b"`,
    );
    await queryRunner.query(
      `ALTER TABLE "knowledge_base_activations" ALTER COLUMN "userId" DROP NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "knowledge_base_activations" ADD "workspaceId" character varying`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_eaaf2f88f5909b4d9a5aeac481" ON "knowledge_bases" ("workspaceId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_5cf36117213eaa4e81b9406f7a" ON "skills" ("workspaceId") `,
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
      `CREATE UNIQUE INDEX "UQ_skill_activation_skill_user" ON "skill_activations" ("skillId", "userId") WHERE "userId" IS NOT NULL`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_skill_activation_skill_workspace" ON "skill_activations" ("skillId", "workspaceId") WHERE "workspaceId" IS NOT NULL`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_knowledge_base_activation_knowledge_base_user" ON "knowledge_base_activations" ("knowledgeBaseId", "userId") WHERE "userId" IS NOT NULL`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_knowledge_base_activation_knowledge_base_workspace" ON "knowledge_base_activations" ("knowledgeBaseId", "workspaceId") WHERE "workspaceId" IS NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "skill_activations" ADD CONSTRAINT "CHK_skill_activations_exactly_one_scope" CHECK (("userId" IS NOT NULL AND "workspaceId" IS NULL) OR ("userId" IS NULL AND "workspaceId" IS NOT NULL))`,
    );
    await queryRunner.query(
      `ALTER TABLE "knowledge_base_activations" ADD CONSTRAINT "CHK_knowledge_base_activations_exactly_one_scope" CHECK (("userId" IS NOT NULL AND "workspaceId" IS NULL) OR ("userId" IS NULL AND "workspaceId" IS NOT NULL))`,
    );
    await queryRunner.query(
      `ALTER TABLE "knowledge_bases" ADD CONSTRAINT "FK_e7f0bbc4c652f1c9146114c1b46" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "knowledge_bases" ADD CONSTRAINT "FK_eaaf2f88f5909b4d9a5aeac4811" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "skills" ADD CONSTRAINT "FK_ee1265e76ea0b8c5f7daa85e817" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "skills" ADD CONSTRAINT "FK_5cf36117213eaa4e81b9406f7a7" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "skill_activations" ADD CONSTRAINT "FK_8caf15dc7766481cd4197e566f8" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "skill_activations" ADD CONSTRAINT "FK_cc7c74d6dd024c547695ea4e4ad" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "knowledge_base_activations" ADD CONSTRAINT "FK_24ccd5ff78be47e2d204e180e9b" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "knowledge_base_activations" ADD CONSTRAINT "FK_aac43ac30367d05ea239285414c" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove the entire scope before restoring user-only activation tables,
    // including rows whose resource owner does not match their activation scope.
    await queryRunner.query(
      `DELETE FROM "skill_activations" WHERE "userId" IS NULL`,
    );
    await queryRunner.query(
      `DELETE FROM "knowledge_base_activations" WHERE "userId" IS NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "knowledge_base_activations" DROP CONSTRAINT "FK_aac43ac30367d05ea239285414c"`,
    );
    await queryRunner.query(
      `ALTER TABLE "knowledge_base_activations" DROP CONSTRAINT "FK_24ccd5ff78be47e2d204e180e9b"`,
    );
    await queryRunner.query(
      `ALTER TABLE "skill_activations" DROP CONSTRAINT "FK_cc7c74d6dd024c547695ea4e4ad"`,
    );
    await queryRunner.query(
      `ALTER TABLE "skill_activations" DROP CONSTRAINT "FK_8caf15dc7766481cd4197e566f8"`,
    );
    await queryRunner.query(
      `ALTER TABLE "skills" DROP CONSTRAINT "FK_5cf36117213eaa4e81b9406f7a7"`,
    );
    await queryRunner.query(
      `ALTER TABLE "skills" DROP CONSTRAINT "FK_ee1265e76ea0b8c5f7daa85e817"`,
    );
    await queryRunner.query(
      `ALTER TABLE "knowledge_bases" DROP CONSTRAINT "FK_eaaf2f88f5909b4d9a5aeac4811"`,
    );
    await queryRunner.query(
      `ALTER TABLE "knowledge_bases" DROP CONSTRAINT "FK_e7f0bbc4c652f1c9146114c1b46"`,
    );
    await queryRunner.query(
      `ALTER TABLE "knowledge_base_activations" DROP CONSTRAINT "CHK_knowledge_base_activations_exactly_one_scope"`,
    );
    await queryRunner.query(
      `ALTER TABLE "skill_activations" DROP CONSTRAINT "CHK_skill_activations_exactly_one_scope"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."UQ_knowledge_base_activation_knowledge_base_workspace"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."UQ_knowledge_base_activation_knowledge_base_user"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."UQ_skill_activation_skill_workspace"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."UQ_skill_activation_skill_user"`,
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
      `DROP INDEX "public"."IDX_5cf36117213eaa4e81b9406f7a"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_eaaf2f88f5909b4d9a5aeac481"`,
    );
    await queryRunner.query(`DELETE FROM "skills" WHERE "userId" IS NULL`);
    await queryRunner.query(
      `DELETE FROM "knowledge_bases" WHERE "userId" IS NULL`,
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
      `ALTER TABLE "knowledge_base_activations" DROP COLUMN "workspaceId"`,
    );
    await queryRunner.query(
      `ALTER TABLE "knowledge_base_activations" ALTER COLUMN "userId" SET NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "knowledge_base_activations" ADD CONSTRAINT "UQ_0a3958c4d093b81e24bb0d5a71d" UNIQUE ("knowledgeBaseId", "userId")`,
    );
    await queryRunner.query(
      `ALTER TABLE "knowledge_base_activations" ADD CONSTRAINT "FK_24ccd5ff78be47e2d204e180e9b" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "skill_activations" DROP COLUMN "workspaceId"`,
    );
    await queryRunner.query(
      `ALTER TABLE "skill_activations" ALTER COLUMN "userId" SET NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "skill_activations" ADD CONSTRAINT "UQ_skill_activation_skillId_userId" UNIQUE ("skillId", "userId")`,
    );
    await queryRunner.query(
      `ALTER TABLE "skill_activations" ADD CONSTRAINT "FK_8caf15dc7766481cd4197e566f8" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(`ALTER TABLE "skills" DROP COLUMN "workspaceId"`);
    await queryRunner.query(
      `ALTER TABLE "knowledge_bases" DROP COLUMN "workspaceId"`,
    );
    await queryRunner.query(
      `ALTER TABLE "skills" ADD CONSTRAINT "UQ_skill_name_userId" UNIQUE ("name", "userId")`,
    );
  }
}
