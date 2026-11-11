import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Existing orgs grant the recording permissions to managers and users, as new
 * orgs do and as skills and knowledge bases are granted. Keep in sync with
 * DEFAULT_ROLE_PERMISSIONS.
 */
export class GrantRecordingPermissions1794434967774 implements MigrationInterface {
  name = 'GrantRecordingPermissions1794434967774';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            INSERT INTO "role_permissions" ("id", "orgId", "role", "permission")
            SELECT gen_random_uuid()::text, o."id", r.role, p.permission
            FROM "orgs" o
            CROSS JOIN (VALUES
                ('manager'::"public"."role_permissions_role_enum"),
                ('user'::"public"."role_permissions_role_enum")
            ) AS r(role)
            CROSS JOIN (VALUES
                ('manage_recordings'::"public"."role_permissions_permission_enum"),
                ('manage_team_recordings'::"public"."role_permissions_permission_enum"),
                ('manage_org_recordings'::"public"."role_permissions_permission_enum")
            ) AS p(permission)
            ON CONFLICT ("orgId", "role", "permission") DO NOTHING
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // The previous migration's down() removes the enum values, so no row may
    // still use them.
    await queryRunner.query(
      `DELETE FROM "role_permissions" WHERE "permission" IN ('manage_recordings', 'manage_team_recordings', 'manage_org_recordings')`,
    );
  }
}
