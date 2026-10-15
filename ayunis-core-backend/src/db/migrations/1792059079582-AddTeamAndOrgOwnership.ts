import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTeamAndOrgOwnership1792059079582 implements MigrationInterface {
  name = 'AddTeamAndOrgOwnership1792059079582';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "knowledge_bases" ADD "teamId" character varying`,
    );
    await queryRunner.query(
      `ALTER TABLE "skills" ADD "teamId" character varying`,
    );
    await queryRunner.query(
      `ALTER TABLE "skills" ADD "orgId" character varying`,
    );
    await queryRunner.query(
      `ALTER TABLE "knowledge_base_activations" ADD "isActive" boolean NOT NULL DEFAULT true`,
    );
    await queryRunner.query(
      `ALTER TABLE "skill_activations" ADD "isActive" boolean NOT NULL DEFAULT true`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_30b897b75b0152629a3f0eaf00" ON "knowledge_bases" ("teamId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_9b743688aaa9d9c6017ca7abbc" ON "skills" ("teamId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_99a21fae6f7d84d8c8b8105ac9" ON "skills" ("orgId") `,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_skills_name_org" ON "skills" ("name", "orgId") WHERE "orgId" IS NOT NULL AND "teamId" IS NULL`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_skills_name_team" ON "skills" ("name", "teamId") WHERE "teamId" IS NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "knowledge_bases" ADD CONSTRAINT "FK_30b897b75b0152629a3f0eaf00a" FOREIGN KEY ("teamId") REFERENCES "teams"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "skills" ADD CONSTRAINT "FK_9b743688aaa9d9c6017ca7abbc4" FOREIGN KEY ("teamId") REFERENCES "teams"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "skills" ADD CONSTRAINT "FK_99a21fae6f7d84d8c8b8105ac94" FOREIGN KEY ("orgId") REFERENCES "orgs"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "skills" DROP CONSTRAINT "CHK_skills_exactly_one_owner"`,
    );
    await queryRunner.query(
      `ALTER TABLE "skills" ADD CONSTRAINT "CHK_skills_exactly_one_owner" CHECK (("userId" IS NOT NULL AND "workspaceId" IS NULL AND "teamId" IS NULL AND "orgId" IS NULL) OR ("workspaceId" IS NOT NULL AND "userId" IS NULL AND "teamId" IS NULL AND "orgId" IS NULL) OR ("teamId" IS NOT NULL AND "orgId" IS NOT NULL AND "userId" IS NULL AND "workspaceId" IS NULL) OR ("orgId" IS NOT NULL AND "userId" IS NULL AND "workspaceId" IS NULL AND "teamId" IS NULL))`,
    );
    await queryRunner.query(
      `ALTER TABLE "knowledge_bases" DROP CONSTRAINT "CHK_knowledge_bases_exactly_one_owner"`,
    );
    await queryRunner.query(
      `ALTER TABLE "knowledge_bases" ADD CONSTRAINT "CHK_knowledge_bases_exactly_one_owner" CHECK (num_nonnulls("userId", "workspaceId", "teamId") <= 1)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DELETE FROM "skills" WHERE "teamId" IS NOT NULL OR "orgId" IS NOT NULL`,
    );
    await queryRunner.query(
      `DELETE FROM "knowledge_bases" WHERE "userId" IS NULL AND "workspaceId" IS NULL`,
    );
    await queryRunner.query(
      `DELETE FROM "skill_activations" WHERE "isActive" = false`,
    );
    await queryRunner.query(
      `DELETE FROM "knowledge_base_activations" WHERE "isActive" = false`,
    );
    await queryRunner.query(
      `ALTER TABLE "knowledge_bases" DROP CONSTRAINT "CHK_knowledge_bases_exactly_one_owner"`,
    );
    await queryRunner.query(
      `ALTER TABLE "knowledge_bases" ADD CONSTRAINT "CHK_knowledge_bases_exactly_one_owner" CHECK (("userId" IS NOT NULL AND "workspaceId" IS NULL) OR ("userId" IS NULL AND "workspaceId" IS NOT NULL))`,
    );
    await queryRunner.query(
      `ALTER TABLE "skills" DROP CONSTRAINT "CHK_skills_exactly_one_owner"`,
    );
    await queryRunner.query(
      `ALTER TABLE "skills" ADD CONSTRAINT "CHK_skills_exactly_one_owner" CHECK (("userId" IS NOT NULL AND "workspaceId" IS NULL) OR ("userId" IS NULL AND "workspaceId" IS NOT NULL))`,
    );
    await queryRunner.query(
      `ALTER TABLE "skills" DROP CONSTRAINT "FK_99a21fae6f7d84d8c8b8105ac94"`,
    );
    await queryRunner.query(
      `ALTER TABLE "skills" DROP CONSTRAINT "FK_9b743688aaa9d9c6017ca7abbc4"`,
    );
    await queryRunner.query(
      `ALTER TABLE "knowledge_bases" DROP CONSTRAINT "FK_30b897b75b0152629a3f0eaf00a"`,
    );
    await queryRunner.query(`DROP INDEX "public"."UQ_skills_name_team"`);
    await queryRunner.query(`DROP INDEX "public"."UQ_skills_name_org"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_99a21fae6f7d84d8c8b8105ac9"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_9b743688aaa9d9c6017ca7abbc"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_30b897b75b0152629a3f0eaf00"`,
    );
    await queryRunner.query(
      `ALTER TABLE "skill_activations" DROP COLUMN "isActive"`,
    );
    await queryRunner.query(
      `ALTER TABLE "knowledge_base_activations" DROP COLUMN "isActive"`,
    );
    await queryRunner.query(`ALTER TABLE "skills" DROP COLUMN "orgId"`);
    await queryRunner.query(`ALTER TABLE "skills" DROP COLUMN "teamId"`);
    await queryRunner.query(
      `ALTER TABLE "knowledge_bases" DROP COLUMN "teamId"`,
    );
  }
}
