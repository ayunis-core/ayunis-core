import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateTeamAdminPermissions1792055088862 implements MigrationInterface {
  name = 'CreateTeamAdminPermissions1792055088862';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."team_admin_permissions_permission_enum" AS ENUM('team_manage_members', 'team_appoint_admins', 'team_manage_skills', 'team_manage_knowledge', 'team_review_requests', 'team_share_workspaces')`,
    );
    await queryRunner.query(
      `CREATE TABLE "team_admin_permissions" ("id" character varying NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "orgId" character varying NOT NULL, "permission" "public"."team_admin_permissions_permission_enum" NOT NULL, CONSTRAINT "UQ_5d55be4fd1de9d2805b0d84a75f" UNIQUE ("orgId", "permission"), CONSTRAINT "PK_2a2de85eb4329dd38daa1a5d54e" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_b8c76e3f9fab6ca77b088a35b4" ON "team_admin_permissions" ("orgId") `,
    );
    await queryRunner.query(
      `ALTER TABLE "team_admin_permissions" ADD CONSTRAINT "FK_b8c76e3f9fab6ca77b088a35b4c" FOREIGN KEY ("orgId") REFERENCES "orgs"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(`
            INSERT INTO "team_admin_permissions" ("id", "orgId", "permission")
            SELECT gen_random_uuid()::text, o."id", p.permission
            FROM "orgs" o
            CROSS JOIN (VALUES
                ('team_manage_members'::"public"."team_admin_permissions_permission_enum"),
                ('team_appoint_admins'::"public"."team_admin_permissions_permission_enum"),
                ('team_manage_skills'::"public"."team_admin_permissions_permission_enum"),
                ('team_manage_knowledge'::"public"."team_admin_permissions_permission_enum"),
                ('team_review_requests'::"public"."team_admin_permissions_permission_enum"),
                ('team_share_workspaces'::"public"."team_admin_permissions_permission_enum")
            ) AS p(permission)
            ON CONFLICT DO NOTHING
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "team_admin_permissions" DROP CONSTRAINT "FK_b8c76e3f9fab6ca77b088a35b4c"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_b8c76e3f9fab6ca77b088a35b4"`,
    );
    await queryRunner.query(`DROP TABLE "team_admin_permissions"`);
    await queryRunner.query(
      `DROP TYPE "public"."team_admin_permissions_permission_enum"`,
    );
  }
}
