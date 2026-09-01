import { MigrationInterface, QueryRunner } from "typeorm";

export class AddWorkspaceResourceOwnership1788258765077 implements MigrationInterface {
    name = 'AddWorkspaceResourceOwnership1788258765077'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "skills" DROP CONSTRAINT "UQ_skill_name_userId"`);
        await queryRunner.query(`ALTER TABLE "knowledge_bases" ADD "workspaceId" character varying`);
        await queryRunner.query(`ALTER TABLE "knowledge_bases" ADD "originKnowledgeBaseId" character varying`);
        await queryRunner.query(`ALTER TABLE "knowledge_bases" ADD "version" integer NOT NULL DEFAULT '1'`);
        await queryRunner.query(`ALTER TABLE "knowledge_bases" ADD "importedOriginVersion" integer`);
        await queryRunner.query(`ALTER TABLE "knowledge_bases" ADD "dismissedOriginVersion" integer`);
        await queryRunner.query(`ALTER TABLE "skills" ADD "workspaceId" character varying`);
        await queryRunner.query(`ALTER TABLE "skills" ADD "originSkillId" character varying`);
        await queryRunner.query(`ALTER TABLE "skills" ADD "version" integer NOT NULL DEFAULT '1'`);
        await queryRunner.query(`ALTER TABLE "skills" ADD "importedOriginVersion" integer`);
        await queryRunner.query(`ALTER TABLE "skills" ADD "dismissedOriginVersion" integer`);
        await queryRunner.query(`CREATE INDEX "IDX_eaaf2f88f5909b4d9a5aeac481" ON "knowledge_bases" ("workspaceId") `);
        await queryRunner.query(`CREATE INDEX "IDX_b67d0e19bd3c8979c2dabd228e" ON "knowledge_bases" ("originKnowledgeBaseId") `);
        await queryRunner.query(`CREATE INDEX "IDX_5cf36117213eaa4e81b9406f7a" ON "skills" ("workspaceId") `);
        await queryRunner.query(`CREATE INDEX "IDX_7a408322405d752dc417e60347" ON "skills" ("originSkillId") `);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_e09b96b2366a6bb31c5b470c93" ON "skills" ("name", "workspaceId") WHERE "workspaceId" IS NOT NULL`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_39f83ca53361290cf4364af818" ON "skills" ("name", "userId") WHERE "workspaceId" IS NULL`);
        await queryRunner.query(`ALTER TABLE "knowledge_bases" ADD CONSTRAINT "FK_eaaf2f88f5909b4d9a5aeac4811" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "knowledge_bases" ADD CONSTRAINT "FK_b67d0e19bd3c8979c2dabd228e3" FOREIGN KEY ("originKnowledgeBaseId") REFERENCES "knowledge_bases"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "skills" ADD CONSTRAINT "FK_5cf36117213eaa4e81b9406f7a7" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "skills" ADD CONSTRAINT "FK_7a408322405d752dc417e60347b" FOREIGN KEY ("originSkillId") REFERENCES "skills"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "skills" DROP CONSTRAINT "FK_7a408322405d752dc417e60347b"`);
        await queryRunner.query(`ALTER TABLE "skills" DROP CONSTRAINT "FK_5cf36117213eaa4e81b9406f7a7"`);
        await queryRunner.query(`ALTER TABLE "knowledge_bases" DROP CONSTRAINT "FK_b67d0e19bd3c8979c2dabd228e3"`);
        await queryRunner.query(`ALTER TABLE "knowledge_bases" DROP CONSTRAINT "FK_eaaf2f88f5909b4d9a5aeac4811"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_39f83ca53361290cf4364af818"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_e09b96b2366a6bb31c5b470c93"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_7a408322405d752dc417e60347"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_5cf36117213eaa4e81b9406f7a"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_b67d0e19bd3c8979c2dabd228e"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_eaaf2f88f5909b4d9a5aeac481"`);
        await queryRunner.query(`ALTER TABLE "skills" DROP COLUMN "dismissedOriginVersion"`);
        await queryRunner.query(`ALTER TABLE "skills" DROP COLUMN "importedOriginVersion"`);
        await queryRunner.query(`ALTER TABLE "skills" DROP COLUMN "version"`);
        await queryRunner.query(`ALTER TABLE "skills" DROP COLUMN "originSkillId"`);
        await queryRunner.query(`ALTER TABLE "skills" DROP COLUMN "workspaceId"`);
        await queryRunner.query(`ALTER TABLE "knowledge_bases" DROP COLUMN "dismissedOriginVersion"`);
        await queryRunner.query(`ALTER TABLE "knowledge_bases" DROP COLUMN "importedOriginVersion"`);
        await queryRunner.query(`ALTER TABLE "knowledge_bases" DROP COLUMN "version"`);
        await queryRunner.query(`ALTER TABLE "knowledge_bases" DROP COLUMN "originKnowledgeBaseId"`);
        await queryRunner.query(`ALTER TABLE "knowledge_bases" DROP COLUMN "workspaceId"`);
        await queryRunner.query(`ALTER TABLE "skills" ADD CONSTRAINT "UQ_skill_name_userId" UNIQUE ("name", "userId")`);
    }

}
