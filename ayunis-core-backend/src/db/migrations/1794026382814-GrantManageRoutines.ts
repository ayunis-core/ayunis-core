import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Every member could use routines before the permission existed, so existing
 * orgs grant it to managers and users, as new orgs do. Keep in sync with
 * DEFAULT_ROLE_PERMISSIONS.
 */
export class GrantManageRoutines1794026382814 implements MigrationInterface {
  name = 'GrantManageRoutines1794026382814';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            INSERT INTO "role_permissions" ("id", "orgId", "role", "permission")
            SELECT gen_random_uuid()::text, o."id", r.role, 'manage_routines'::"public"."role_permissions_permission_enum"
            FROM "orgs" o
            CROSS JOIN (VALUES
                ('manager'::"public"."role_permissions_role_enum"),
                ('user'::"public"."role_permissions_role_enum")
            ) AS r(role)
            ON CONFLICT ("orgId", "role", "permission") DO NOTHING
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // The previous migration's down() removes both enum values, so no row may
    // still use them.
    await queryRunner.query(
      `DELETE FROM "role_permissions" WHERE "permission" = 'manage_routines'`,
    );
    await queryRunner.query(
      `UPDATE "routines" SET "lastRunStatus" = NULL, "lastRunFailureReason" = NULL WHERE "lastRunStatus" = 'skipped'`,
    );
  }
}
