import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateRolePermissions1785144619890 implements MigrationInterface {
  name = 'CreateRolePermissions1785144619890';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."role_permissions_role_enum" AS ENUM('admin', 'manager', 'user')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."role_permissions_permission_enum" AS ENUM('manage_teams', 'assign_users_to_teams', 'manage_skills', 'share_skills', 'manage_knowledge_bases', 'share_knowledge_bases')`,
    );
    await queryRunner.query(
      `CREATE TABLE "role_permissions" ("id" character varying NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "orgId" character varying NOT NULL, "role" "public"."role_permissions_role_enum" NOT NULL, "permission" "public"."role_permissions_permission_enum" NOT NULL, CONSTRAINT "UQ_baac37a9ae5a954455acd47b825" UNIQUE ("orgId", "role", "permission"), CONSTRAINT "PK_84059017c90bfcb701b8fa42297" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_f9cbbfb6713f64b9c2b6cd8b22" ON "role_permissions" ("orgId") `,
    );
    await queryRunner.query(
      `ALTER TABLE "role_permissions" ADD CONSTRAINT "FK_f9cbbfb6713f64b9c2b6cd8b220" FOREIGN KEY ("orgId") REFERENCES "orgs"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    // Backfill existing orgs so no member silently loses the skill/knowledge-base
    // access they had before RBAC. Managers and users get the same defaults;
    // team management stays admin-only. Keep in sync with DEFAULT_ROLE_PERMISSIONS.
    await queryRunner.query(`
            INSERT INTO "role_permissions" ("id", "orgId", "role", "permission")
            SELECT gen_random_uuid()::text, o."id", r.role, p.permission
            FROM "orgs" o
            CROSS JOIN (VALUES
                ('manager'::"public"."role_permissions_role_enum"),
                ('user'::"public"."role_permissions_role_enum")
            ) AS r(role)
            CROSS JOIN (VALUES
                ('manage_skills'::"public"."role_permissions_permission_enum"),
                ('share_skills'::"public"."role_permissions_permission_enum"),
                ('manage_knowledge_bases'::"public"."role_permissions_permission_enum"),
                ('share_knowledge_bases'::"public"."role_permissions_permission_enum")
            ) AS p(permission)
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "role_permissions" DROP CONSTRAINT "FK_f9cbbfb6713f64b9c2b6cd8b220"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_f9cbbfb6713f64b9c2b6cd8b22"`,
    );
    await queryRunner.query(`DROP TABLE "role_permissions"`);
    await queryRunner.query(
      `DROP TYPE "public"."role_permissions_permission_enum"`,
    );
    await queryRunner.query(`DROP TYPE "public"."role_permissions_role_enum"`);
  }
}
