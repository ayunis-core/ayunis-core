import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddWorkspaceSharing1792075640719 implements MigrationInterface {
  name = 'AddWorkspaceSharing1792075640719';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "workspace_access_teams" ("id" character varying NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "workspaceId" character varying NOT NULL, "teamId" character varying NOT NULL, "accessLevel" character varying(16) NOT NULL, "grantedAt" TIMESTAMP NOT NULL, CONSTRAINT "UQ_workspace_access_teams_workspace_team" UNIQUE ("workspaceId", "teamId"), CONSTRAINT "CHK_workspace_access_teams_level" CHECK ("accessLevel" IN ('use', 'edit', 'full')), CONSTRAINT "PK_6fd1ecd050f3fc3e6c8ec638849" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_494c0393a89b1acf50033f0097" ON "workspace_access_teams" ("teamId") `,
    );
    await queryRunner.query(
      `CREATE TABLE "workspace_access_team_overrides" ("id" character varying NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "teamGrantId" character varying NOT NULL, "workspaceId" character varying NOT NULL, "userId" character varying NOT NULL, "accessLevel" character varying(16), "excluded" boolean NOT NULL DEFAULT false, CONSTRAINT "UQ_workspace_access_team_overrides_grant_user" UNIQUE ("teamGrantId", "userId"), CONSTRAINT "CHK_workspace_access_team_overrides_level" CHECK (("excluded" AND "accessLevel" IS NULL) OR (NOT "excluded" AND "accessLevel" IN ('use', 'edit', 'full'))), CONSTRAINT "PK_99157482e180601efbe6920ab8a" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_35fecc07c8039e429469d0232b" ON "workspace_access_team_overrides" ("workspaceId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_a2a0624ebe4b3a7f21c132b768" ON "workspace_access_team_overrides" ("userId") `,
    );
    await queryRunner.query(
      `CREATE TABLE "workspace_access_people" ("id" character varying NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "workspaceId" character varying NOT NULL, "userId" character varying NOT NULL, "accessLevel" character varying(16) NOT NULL, CONSTRAINT "UQ_workspace_access_people_workspace_user" UNIQUE ("workspaceId", "userId"), CONSTRAINT "CHK_workspace_access_people_level" CHECK ("accessLevel" IN ('use', 'edit', 'full')), CONSTRAINT "PK_4bc4ee66646f49827905d529099" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_03d07bcd7a684f6f20d7facab6" ON "workspace_access_people" ("userId") `,
    );
    await queryRunner.query(
      `CREATE TABLE "workspace_access_org_exclusions" ("id" character varying NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "workspaceId" character varying NOT NULL, "userId" character varying NOT NULL, CONSTRAINT "UQ_workspace_access_org_exclusions_workspace_user" UNIQUE ("workspaceId", "userId"), CONSTRAINT "PK_2bf40a7cc4b54afe3efc2d0e7ad" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_1099f72976ee4b1fdd686a6924" ON "workspace_access_org_exclusions" ("userId") `,
    );
    await queryRunner.query(
      `ALTER TABLE "workspaces" ADD "isSharedWithOrganization" boolean NOT NULL DEFAULT false`,
    );
    await queryRunner.query(
      `ALTER TABLE "workspace_access_teams" ADD CONSTRAINT "FK_ff09d43f3b58bd03d0e323d6099" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "workspace_access_teams" ADD CONSTRAINT "FK_494c0393a89b1acf50033f00976" FOREIGN KEY ("teamId") REFERENCES "teams"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "workspace_access_team_overrides" ADD CONSTRAINT "FK_520a154337b0aee56902446b319" FOREIGN KEY ("teamGrantId") REFERENCES "workspace_access_teams"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "workspace_access_team_overrides" ADD CONSTRAINT "FK_35fecc07c8039e429469d0232bb" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "workspace_access_team_overrides" ADD CONSTRAINT "FK_a2a0624ebe4b3a7f21c132b7686" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "workspace_access_people" ADD CONSTRAINT "FK_ff045446d94ceef2365e580cbd0" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "workspace_access_people" ADD CONSTRAINT "FK_03d07bcd7a684f6f20d7facab6c" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "workspace_access_org_exclusions" ADD CONSTRAINT "FK_0bc55b0f873b2f8d59e9da13274" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "workspace_access_org_exclusions" ADD CONSTRAINT "FK_1099f72976ee4b1fdd686a69243" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "workspace_access_org_exclusions" DROP CONSTRAINT "FK_1099f72976ee4b1fdd686a69243"`,
    );
    await queryRunner.query(
      `ALTER TABLE "workspace_access_org_exclusions" DROP CONSTRAINT "FK_0bc55b0f873b2f8d59e9da13274"`,
    );
    await queryRunner.query(
      `ALTER TABLE "workspace_access_people" DROP CONSTRAINT "FK_03d07bcd7a684f6f20d7facab6c"`,
    );
    await queryRunner.query(
      `ALTER TABLE "workspace_access_people" DROP CONSTRAINT "FK_ff045446d94ceef2365e580cbd0"`,
    );
    await queryRunner.query(
      `ALTER TABLE "workspace_access_team_overrides" DROP CONSTRAINT "FK_a2a0624ebe4b3a7f21c132b7686"`,
    );
    await queryRunner.query(
      `ALTER TABLE "workspace_access_team_overrides" DROP CONSTRAINT "FK_35fecc07c8039e429469d0232bb"`,
    );
    await queryRunner.query(
      `ALTER TABLE "workspace_access_team_overrides" DROP CONSTRAINT "FK_520a154337b0aee56902446b319"`,
    );
    await queryRunner.query(
      `ALTER TABLE "workspace_access_teams" DROP CONSTRAINT "FK_494c0393a89b1acf50033f00976"`,
    );
    await queryRunner.query(
      `ALTER TABLE "workspace_access_teams" DROP CONSTRAINT "FK_ff09d43f3b58bd03d0e323d6099"`,
    );
    await queryRunner.query(
      `ALTER TABLE "workspaces" DROP COLUMN "isSharedWithOrganization"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_1099f72976ee4b1fdd686a6924"`,
    );
    await queryRunner.query(`DROP TABLE "workspace_access_org_exclusions"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_03d07bcd7a684f6f20d7facab6"`,
    );
    await queryRunner.query(`DROP TABLE "workspace_access_people"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_a2a0624ebe4b3a7f21c132b768"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_35fecc07c8039e429469d0232b"`,
    );
    await queryRunner.query(`DROP TABLE "workspace_access_team_overrides"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_494c0393a89b1acf50033f0097"`,
    );
    await queryRunner.query(`DROP TABLE "workspace_access_teams"`);
  }
}
