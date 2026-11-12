import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateRecordingsAndRecordingPermissions1794434967773 implements MigrationInterface {
  name = 'CreateRecordingsAndRecordingPermissions1794434967773';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "recordings" ("id" character varying NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "name" character varying(255) NOT NULL, "orgId" character varying NOT NULL, "userId" character varying, "workspaceId" character varying, "teamId" character varying, "isOrgOwned" boolean NOT NULL DEFAULT false, "createdByUserId" character varying, CONSTRAINT "CHK_recordings_single_owner" CHECK (num_nonnulls("userId", "workspaceId", "teamId") + "isOrgOwned"::int = 1), CONSTRAINT "PK_8c3247d5ee4551d59bb2115a484" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_89035387ebacd0eeffd1e3b198" ON "recordings" ("orgId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_99ac9d3d84bc0d9af703d321a4" ON "recordings" ("userId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_c9965a023067a39dc40bf8467c" ON "recordings" ("workspaceId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_739f797c9f954640e1425db1e7" ON "recordings" ("teamId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_dcbd41b98a5f9b0386d3ccb1a5" ON "recordings" ("createdByUserId") `,
    );
    await queryRunner.query(
      `ALTER TABLE "role_permissions" DROP CONSTRAINT "UQ_baac37a9ae5a954455acd47b825"`,
    );
    await queryRunner.query(
      `ALTER TYPE "public"."role_permissions_permission_enum" RENAME TO "role_permissions_permission_enum_old"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."role_permissions_permission_enum" AS ENUM('manage_teams', 'assign_users_to_teams', 'manage_skills', 'share_skills_with_teams', 'share_skills_with_org', 'manage_knowledge_bases', 'share_knowledge_bases_with_teams', 'share_knowledge_bases_with_org', 'manage_routines', 'manage_recordings', 'manage_team_recordings', 'manage_org_recordings')`,
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
    await queryRunner.query(
      `ALTER TABLE "recordings" ADD CONSTRAINT "FK_89035387ebacd0eeffd1e3b198a" FOREIGN KEY ("orgId") REFERENCES "orgs"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "recordings" ADD CONSTRAINT "FK_99ac9d3d84bc0d9af703d321a43" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "recordings" ADD CONSTRAINT "FK_c9965a023067a39dc40bf8467c3" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "recordings" ADD CONSTRAINT "FK_739f797c9f954640e1425db1e71" FOREIGN KEY ("teamId") REFERENCES "teams"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "recordings" ADD CONSTRAINT "FK_dcbd41b98a5f9b0386d3ccb1a57" FOREIGN KEY ("createdByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "recordings" DROP CONSTRAINT "FK_dcbd41b98a5f9b0386d3ccb1a57"`,
    );
    await queryRunner.query(
      `ALTER TABLE "recordings" DROP CONSTRAINT "FK_739f797c9f954640e1425db1e71"`,
    );
    await queryRunner.query(
      `ALTER TABLE "recordings" DROP CONSTRAINT "FK_c9965a023067a39dc40bf8467c3"`,
    );
    await queryRunner.query(
      `ALTER TABLE "recordings" DROP CONSTRAINT "FK_99ac9d3d84bc0d9af703d321a43"`,
    );
    await queryRunner.query(
      `ALTER TABLE "recordings" DROP CONSTRAINT "FK_89035387ebacd0eeffd1e3b198a"`,
    );
    await queryRunner.query(
      `ALTER TABLE "role_permissions" DROP CONSTRAINT "UQ_baac37a9ae5a954455acd47b825"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."role_permissions_permission_enum_old" AS ENUM('assign_users_to_teams', 'manage_knowledge_bases', 'manage_routines', 'manage_skills', 'manage_teams', 'share_knowledge_bases_with_org', 'share_knowledge_bases_with_teams', 'share_skills_with_org', 'share_skills_with_teams')`,
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
    await queryRunner.query(
      `DROP INDEX "public"."IDX_dcbd41b98a5f9b0386d3ccb1a5"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_739f797c9f954640e1425db1e7"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_c9965a023067a39dc40bf8467c"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_99ac9d3d84bc0d9af703d321a4"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_89035387ebacd0eeffd1e3b198"`,
    );
    await queryRunner.query(`DROP TABLE "recordings"`);
  }
}
