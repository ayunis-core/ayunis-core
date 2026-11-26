import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddInstallMarketplaceRoutinesPermission1795541150376 implements MigrationInterface {
  name = 'AddInstallMarketplaceRoutinesPermission1795541150376';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "role_permissions" DROP CONSTRAINT "UQ_baac37a9ae5a954455acd47b825"`,
    );
    await queryRunner.query(
      `ALTER TYPE "public"."role_permissions_permission_enum" RENAME TO "role_permissions_permission_enum_old"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."role_permissions_permission_enum" AS ENUM('manage_teams', 'assign_users_to_teams', 'manage_skills', 'install_marketplace_skills', 'share_skills_with_teams', 'share_skills_with_org', 'manage_knowledge_bases', 'share_knowledge_bases_with_teams', 'share_knowledge_bases_with_org', 'manage_routines', 'install_marketplace_routines', 'manage_workspace', 'manage_workspace_members', 'manage_recordings', 'manage_team_recordings', 'manage_org_recordings')`,
    );
    await queryRunner.query(
      `ALTER TABLE "role_permissions" ALTER COLUMN "permission" TYPE "public"."role_permissions_permission_enum" USING "permission"::"text"::"public"."role_permissions_permission_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE "public"."role_permissions_permission_enum_old"`,
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
      `CREATE TYPE "public"."role_permissions_permission_enum_old" AS ENUM('assign_users_to_teams', 'install_marketplace_skills', 'manage_knowledge_bases', 'manage_org_recordings', 'manage_recordings', 'manage_routines', 'manage_skills', 'manage_team_recordings', 'manage_teams', 'manage_workspace', 'manage_workspace_members', 'share_knowledge_bases_with_org', 'share_knowledge_bases_with_teams', 'share_skills_with_org', 'share_skills_with_teams')`,
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
  }
}
