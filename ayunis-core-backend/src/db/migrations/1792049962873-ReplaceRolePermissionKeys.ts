import type { MigrationInterface, QueryRunner } from 'typeorm';

export class ReplaceRolePermissionKeys1792049962873 implements MigrationInterface {
  name = 'ReplaceRolePermissionKeys1792049962873';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "role_permissions" DROP CONSTRAINT "UQ_baac37a9ae5a954455acd47b825"`,
    );
    await queryRunner.query(
      `ALTER TYPE "public"."role_permissions_permission_enum" RENAME TO "role_permissions_permission_enum_old"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."role_permissions_permission_enum" AS ENUM('manage_teams', 'assign_users_to_teams', 'manage_own_skills', 'install_marketplace_skills', 'request_skill_transfer', 'request_skill_transfer_other_teams', 'request_skill_transfer_org', 'manage_org_skills', 'review_all_skill_requests', 'manage_own_knowledge', 'request_knowledge_transfer', 'request_knowledge_transfer_other_teams', 'request_knowledge_transfer_org', 'manage_org_knowledge', 'review_all_knowledge_requests', 'create_workspaces', 'share_workspaces', 'share_workspaces_org')`,
    );
    await queryRunner.query(
      `ALTER TABLE "role_permissions" ALTER COLUMN "permission" TYPE text`,
    );
    await queryRunner.query(`
            INSERT INTO "role_permissions" ("id", "orgId", "role", "permission")
            SELECT gen_random_uuid()::text, rp."orgId", rp."role", m.granted
            FROM "role_permissions" rp
            JOIN (VALUES
                ('manage_skills', 'install_marketplace_skills'),
                ('share_skills', 'request_skill_transfer_org'),
                ('share_knowledge_bases', 'request_knowledge_transfer_org')
            ) AS m(existing, granted) ON m.existing = rp."permission"
            WHERE NOT EXISTS (
                SELECT 1 FROM "role_permissions" x
                WHERE x."orgId" = rp."orgId"
                  AND x."role" = rp."role"
                  AND x."permission" = m.granted
            )
        `);
    await queryRunner.query(`
            UPDATE "role_permissions"
            SET "permission" = CASE "permission"
                WHEN 'manage_skills' THEN 'manage_own_skills'
                WHEN 'share_skills' THEN 'request_skill_transfer'
                WHEN 'manage_knowledge_bases' THEN 'manage_own_knowledge'
                WHEN 'share_knowledge_bases' THEN 'request_knowledge_transfer'
            END
            WHERE "permission" IN ('manage_skills', 'share_skills', 'manage_knowledge_bases', 'share_knowledge_bases')
        `);
    await queryRunner.query(`
            INSERT INTO "role_permissions" ("id", "orgId", "role", "permission")
            SELECT gen_random_uuid()::text, o."id", r.role, p.permission
            FROM "orgs" o
            CROSS JOIN (VALUES
                ('manager'::"public"."role_permissions_role_enum"),
                ('user'::"public"."role_permissions_role_enum")
            ) AS r(role)
            CROSS JOIN (VALUES ('create_workspaces'), ('share_workspaces')) AS p(permission)
            WHERE NOT EXISTS (
                SELECT 1 FROM "role_permissions" x
                WHERE x."orgId" = o."id"
                  AND x."role" = r.role
                  AND x."permission" = p.permission
            )
        `);
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
      `CREATE TYPE "public"."role_permissions_permission_enum_old" AS ENUM('manage_teams', 'assign_users_to_teams', 'manage_skills', 'share_skills', 'manage_knowledge_bases', 'share_knowledge_bases')`,
    );
    await queryRunner.query(
      `ALTER TABLE "role_permissions" ALTER COLUMN "permission" TYPE text`,
    );
    await queryRunner.query(`
            INSERT INTO "role_permissions" ("id", "orgId", "role", "permission")
            SELECT gen_random_uuid()::text, grouped."orgId", grouped."role", grouped.permission
            FROM (
                SELECT DISTINCT rp."orgId", rp."role",
                    CASE
                        WHEN rp."permission" LIKE 'request_skill_transfer%' THEN 'share_skills'
                        ELSE 'share_knowledge_bases'
                    END AS permission
                FROM "role_permissions" rp
                WHERE rp."permission" IN ('request_skill_transfer', 'request_skill_transfer_org', 'request_knowledge_transfer', 'request_knowledge_transfer_org')
            ) AS grouped
        `);
    await queryRunner.query(`
            UPDATE "role_permissions"
            SET "permission" = CASE "permission"
                WHEN 'manage_own_skills' THEN 'manage_skills'
                WHEN 'manage_own_knowledge' THEN 'manage_knowledge_bases'
            END
            WHERE "permission" IN ('manage_own_skills', 'manage_own_knowledge')
        `);
    await queryRunner.query(`
            DELETE FROM "role_permissions"
            WHERE "permission" NOT IN ('manage_teams', 'assign_users_to_teams', 'manage_skills', 'share_skills', 'manage_knowledge_bases', 'share_knowledge_bases')
        `);
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
