import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Existing orgs get the same workspace defaults as new orgs: managers may
 * manage a workspace and its members, users may only use it. Keep in sync
 * with DEFAULT_ROLE_PERMISSIONS.
 */
export class GrantWorkspacePermissions1794265224835 implements MigrationInterface {
  name = 'GrantWorkspacePermissions1794265224835';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            INSERT INTO "role_permissions" ("id", "orgId", "role", "permission")
            SELECT gen_random_uuid()::text, o."id", 'manager'::"public"."role_permissions_role_enum", p.permission
            FROM "orgs" o
            CROSS JOIN (VALUES
                ('manage_workspace'::"public"."role_permissions_permission_enum"),
                ('manage_workspace_members'::"public"."role_permissions_permission_enum")
            ) AS p(permission)
            ON CONFLICT ("orgId", "role", "permission") DO NOTHING
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // The previous migration's down() removes both enum values, so no row may
    // still use them.
    await queryRunner.query(
      `DELETE FROM "role_permissions" WHERE "permission" IN ('manage_workspace', 'manage_workspace_members')`,
    );
  }
}
