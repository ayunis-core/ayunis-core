import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTeamAndOrgSkillOwnership1793977098886 implements MigrationInterface {
  name = 'AddTeamAndOrgSkillOwnership1793977098886';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "skills" DROP CONSTRAINT "CHK_skills_exactly_one_owner"`,
    );
    await queryRunner.query(
      `ALTER TABLE "skills" ADD "teamId" character varying`,
    );
    await queryRunner.query(
      `ALTER TABLE "skills" ADD "orgId" character varying`,
    );
    await queryRunner.query(
      `ALTER TABLE "skills" ADD "isActive" boolean NOT NULL DEFAULT false`,
    );
    await queryRunner.query(
      `ALTER TABLE "skills" ADD "isPinned" boolean NOT NULL DEFAULT false`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_9b743688aaa9d9c6017ca7abbc" ON "skills" ("teamId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_99a21fae6f7d84d8c8b8105ac9" ON "skills" ("orgId") `,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_47249fb3bca63e4da4c9a80000" ON "skills" ("name", "orgId") WHERE "orgId" IS NOT NULL`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_3a7d45047e4d0632010d93f2dd" ON "skills" ("name", "teamId") WHERE "teamId" IS NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "skills" ADD CONSTRAINT "CHK_skills_single_owner" CHECK (num_nonnulls("userId", "workspaceId", "teamId", "orgId") = 1)`,
    );
    await queryRunner.query(
      `ALTER TABLE "skills" ADD CONSTRAINT "FK_9b743688aaa9d9c6017ca7abbc4" FOREIGN KEY ("teamId") REFERENCES "teams"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "skills" ADD CONSTRAINT "FK_99a21fae6f7d84d8c8b8105ac94" FOREIGN KEY ("orgId") REFERENCES "orgs"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // The restored check only admits user or workspace owners, so team- and
    // org-owned skills cannot survive a rollback.
    await queryRunner.query(
      `DELETE FROM "skills" WHERE "teamId" IS NOT NULL OR "orgId" IS NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "skills" DROP CONSTRAINT "FK_99a21fae6f7d84d8c8b8105ac94"`,
    );
    await queryRunner.query(
      `ALTER TABLE "skills" DROP CONSTRAINT "FK_9b743688aaa9d9c6017ca7abbc4"`,
    );
    await queryRunner.query(
      `ALTER TABLE "skills" DROP CONSTRAINT "CHK_skills_single_owner"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_3a7d45047e4d0632010d93f2dd"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_47249fb3bca63e4da4c9a80000"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_99a21fae6f7d84d8c8b8105ac9"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_9b743688aaa9d9c6017ca7abbc"`,
    );
    await queryRunner.query(`ALTER TABLE "skills" DROP COLUMN "isPinned"`);
    await queryRunner.query(`ALTER TABLE "skills" DROP COLUMN "isActive"`);
    await queryRunner.query(`ALTER TABLE "skills" DROP COLUMN "orgId"`);
    await queryRunner.query(`ALTER TABLE "skills" DROP COLUMN "teamId"`);
    await queryRunner.query(
      `ALTER TABLE "skills" ADD CONSTRAINT "CHK_skills_exactly_one_owner" CHECK (((("userId" IS NOT NULL) AND ("workspaceId" IS NULL)) OR (("userId" IS NULL) AND ("workspaceId" IS NOT NULL))))`,
    );
  }
}
