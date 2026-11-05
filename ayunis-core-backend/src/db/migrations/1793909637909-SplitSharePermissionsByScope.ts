import type { MigrationInterface, QueryRunner } from 'typeorm';

export class SplitSharePermissionsByScope1793909637909 implements MigrationInterface {
  name = 'SplitSharePermissionsByScope1793909637909';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Each former share permission becomes its team-scoped successor in place,
    // and the org-scoped successor is granted wherever it was held, so every
    // role keeps exactly the sharing access it had.
    await queryRunner.query(
      `ALTER TYPE "public"."role_permissions_permission_enum" RENAME VALUE 'share_skills' TO 'share_skills_with_teams'`,
    );
    await queryRunner.query(
      `ALTER TYPE "public"."role_permissions_permission_enum" RENAME VALUE 'share_knowledge_bases' TO 'share_knowledge_bases_with_teams'`,
    );
    await queryRunner.query(
      `ALTER TABLE "role_permissions" DROP CONSTRAINT "UQ_baac37a9ae5a954455acd47b825"`,
    );
    await queryRunner.query(
      `ALTER TYPE "public"."role_permissions_permission_enum" RENAME TO "role_permissions_permission_enum_old"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."role_permissions_permission_enum" AS ENUM('manage_teams', 'assign_users_to_teams', 'manage_skills', 'share_skills_with_teams', 'share_skills_with_org', 'manage_knowledge_bases', 'share_knowledge_bases_with_teams', 'share_knowledge_bases_with_org')`,
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
    await queryRunner.query(`
            INSERT INTO "role_permissions" ("id", "orgId", "role", "permission")
            SELECT gen_random_uuid()::text, rp."orgId", rp."role", m.org_permission
            FROM "role_permissions" rp
            JOIN (VALUES
                ('share_skills_with_teams'::"public"."role_permissions_permission_enum", 'share_skills_with_org'::"public"."role_permissions_permission_enum"),
                ('share_knowledge_bases_with_teams'::"public"."role_permissions_permission_enum", 'share_knowledge_bases_with_org'::"public"."role_permissions_permission_enum")
            ) AS m(team_permission, org_permission) ON rp."permission" = m.team_permission
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // The former permission is granted if either successor is held, so a
    // rollback never removes sharing access a role had.
    await queryRunner.query(`
            INSERT INTO "role_permissions" ("id", "orgId", "role", "permission")
            SELECT gen_random_uuid()::text, rp."orgId", rp."role", m.team_permission
            FROM "role_permissions" rp
            JOIN (VALUES
                ('share_skills_with_teams'::"public"."role_permissions_permission_enum", 'share_skills_with_org'::"public"."role_permissions_permission_enum"),
                ('share_knowledge_bases_with_teams'::"public"."role_permissions_permission_enum", 'share_knowledge_bases_with_org'::"public"."role_permissions_permission_enum")
            ) AS m(team_permission, org_permission) ON rp."permission" = m.org_permission
            ON CONFLICT ("orgId", "role", "permission") DO NOTHING
        `);
    await queryRunner.query(
      `DELETE FROM "role_permissions" WHERE "permission" IN ('share_skills_with_org', 'share_knowledge_bases_with_org')`,
    );
    await queryRunner.query(
      `ALTER TYPE "public"."role_permissions_permission_enum" RENAME VALUE 'share_skills_with_teams' TO 'share_skills'`,
    );
    await queryRunner.query(
      `ALTER TYPE "public"."role_permissions_permission_enum" RENAME VALUE 'share_knowledge_bases_with_teams' TO 'share_knowledge_bases'`,
    );
    await queryRunner.query(
      `ALTER TABLE "role_permissions" DROP CONSTRAINT "UQ_baac37a9ae5a954455acd47b825"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."role_permissions_permission_enum_old" AS ENUM('assign_users_to_teams', 'manage_knowledge_bases', 'manage_skills', 'manage_teams', 'share_knowledge_bases', 'share_skills')`,
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
