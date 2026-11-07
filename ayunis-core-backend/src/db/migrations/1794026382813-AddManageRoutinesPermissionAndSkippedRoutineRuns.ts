import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddManageRoutinesPermissionAndSkippedRoutineRuns1794026382813 implements MigrationInterface {
  name = 'AddManageRoutinesPermissionAndSkippedRoutineRuns1794026382813';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "public"."IDX_f03becaa532f285b609afea51f"`,
    );
    await queryRunner.query(
      `ALTER TYPE "public"."routines_lastrunstatus_enum" RENAME TO "routines_lastrunstatus_enum_old"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."routines_lastrunstatus_enum" AS ENUM('queued', 'running', 'succeeded', 'failed', 'skipped')`,
    );
    await queryRunner.query(
      `ALTER TABLE "routines" ALTER COLUMN "lastRunStatus" TYPE "public"."routines_lastrunstatus_enum" USING "lastRunStatus"::"text"::"public"."routines_lastrunstatus_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE "public"."routines_lastrunstatus_enum_old"`,
    );
    await queryRunner.query(
      `ALTER TABLE "role_permissions" DROP CONSTRAINT "UQ_baac37a9ae5a954455acd47b825"`,
    );
    await queryRunner.query(
      `ALTER TYPE "public"."role_permissions_permission_enum" RENAME TO "role_permissions_permission_enum_old"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."role_permissions_permission_enum" AS ENUM('manage_teams', 'assign_users_to_teams', 'manage_skills', 'share_skills_with_teams', 'share_skills_with_org', 'manage_knowledge_bases', 'share_knowledge_bases_with_teams', 'share_knowledge_bases_with_org', 'manage_routines')`,
    );
    await queryRunner.query(
      `ALTER TABLE "role_permissions" ALTER COLUMN "permission" TYPE "public"."role_permissions_permission_enum" USING "permission"::"text"::"public"."role_permissions_permission_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE "public"."role_permissions_permission_enum_old"`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_d4051b8f935abcbd4bc794ad34" ON "routines" ("lastRunStatus", "lastRunStartedAt") `,
    );
    await queryRunner.query(
      `ALTER TABLE "role_permissions" ADD CONSTRAINT "UQ_baac37a9ae5a954455acd47b825" UNIQUE ("orgId", "role", "permission")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "role_permissions" DROP CONSTRAINT "UQ_baac37a9ae5a954455acd47b825"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_d4051b8f935abcbd4bc794ad34"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."role_permissions_permission_enum_old" AS ENUM('assign_users_to_teams', 'manage_knowledge_bases', 'manage_skills', 'manage_teams', 'share_knowledge_bases_with_org', 'share_knowledge_bases_with_teams', 'share_skills_with_org', 'share_skills_with_teams')`,
    );
    await queryRunner.query(
      `ALTER TABLE "role_permissions" ALTER COLUMN "permission" TYPE "public"."role_permissions_permission_enum_old" USING "permission"::"text"::"public"."role_permissions_permission_enum_old"`,
    );
    await queryRunner.query(
      `DROP TYPE "public"."role_permissions_permission_enum"`,
    );
    await queryRunner.query(
      `ALTER TYPE "public"."role_permissions_permission_enum_old" RENAME TO "role_permissions_permission_enum"`,
    );
    await queryRunner.query(
      `ALTER TABLE "role_permissions" ADD CONSTRAINT "UQ_baac37a9ae5a954455acd47b825" UNIQUE ("orgId", "role", "permission")`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."routines_lastrunstatus_enum_old" AS ENUM('failed', 'queued', 'running', 'succeeded')`,
    );
    await queryRunner.query(
      `ALTER TABLE "routines" ALTER COLUMN "lastRunStatus" TYPE "public"."routines_lastrunstatus_enum_old" USING "lastRunStatus"::"text"::"public"."routines_lastrunstatus_enum_old"`,
    );
    await queryRunner.query(`DROP TYPE "public"."routines_lastrunstatus_enum"`);
    await queryRunner.query(
      `ALTER TYPE "public"."routines_lastrunstatus_enum_old" RENAME TO "routines_lastrunstatus_enum"`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_f03becaa532f285b609afea51f" ON "routines" ("lastRunStartedAt") WHERE ("lastRunStatus" = 'running'::routines_lastrunstatus_enum)`,
    );
  }
}
