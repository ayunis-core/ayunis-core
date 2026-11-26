import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Every role that may manage routines may also install them from the
 * Marketplace, as in DEFAULT_ROLE_PERMISSIONS for new orgs.
 */
export class GrantInstallMarketplaceRoutines1795541150377 implements MigrationInterface {
  name = 'GrantInstallMarketplaceRoutines1795541150377';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            INSERT INTO "role_permissions" ("id", "orgId", "role", "permission")
            SELECT gen_random_uuid()::text, rp."orgId", rp."role", 'install_marketplace_routines'::"public"."role_permissions_permission_enum"
            FROM "role_permissions" rp
            WHERE rp."permission" = 'manage_routines'
            ON CONFLICT ("orgId", "role", "permission") DO NOTHING
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // The previous migration's down() removes the enum value, so no row may
    // still use it.
    await queryRunner.query(
      `DELETE FROM "role_permissions" WHERE "permission" = 'install_marketplace_routines'`,
    );
  }
}
