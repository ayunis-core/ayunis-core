import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Installing from the Marketplace required manage_skills before it had its own
 * permission, so every role that holds manage_skills keeps installing. New orgs
 * get it from DEFAULT_ROLE_PERMISSIONS.
 */
export class GrantInstallMarketplaceSkills1794987987937 implements MigrationInterface {
  name = 'GrantInstallMarketplaceSkills1794987987937';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            INSERT INTO "role_permissions" ("id", "orgId", "role", "permission")
            SELECT gen_random_uuid()::text, rp."orgId", rp."role", 'install_marketplace_skills'::"public"."role_permissions_permission_enum"
            FROM "role_permissions" rp
            WHERE rp."permission" = 'manage_skills'
            ON CONFLICT ("orgId", "role", "permission") DO NOTHING
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // The previous migration's down() removes the enum value, so no row may
    // still use it.
    await queryRunner.query(
      `DELETE FROM "role_permissions" WHERE "permission" = 'install_marketplace_skills'`,
    );
  }
}
