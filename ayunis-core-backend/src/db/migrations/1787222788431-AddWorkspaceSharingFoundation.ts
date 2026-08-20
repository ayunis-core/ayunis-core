import { MigrationInterface, QueryRunner } from "typeorm";

export class AddWorkspaceSharingFoundation1787222788431 implements MigrationInterface {
    name = 'AddWorkspaceSharingFoundation1787222788431'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."workspace_team_grants_role_enum" AS ENUM('use', 'edit', 'full')`);
        await queryRunner.query(`CREATE TABLE "workspace_team_grants" ("id" character varying NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "workspaceId" character varying NOT NULL, "teamId" character varying NOT NULL, "role" "public"."workspace_team_grants_role_enum" NOT NULL, CONSTRAINT "PK_87fec0a731ae8d9e7083c10260a" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_2ff4d832b168963b4db7504e0f" ON "workspace_team_grants" ("teamId") `);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_b1b4f119fda273430a147a8667" ON "workspace_team_grants" ("workspaceId", "teamId") `);
        await queryRunner.query(`CREATE TYPE "public"."workspace_team_member_overrides_role_enum" AS ENUM('use', 'edit', 'full')`);
        await queryRunner.query(`CREATE TABLE "workspace_team_member_overrides" ("id" character varying NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "teamGrantId" character varying NOT NULL, "userId" character varying NOT NULL, "role" "public"."workspace_team_member_overrides_role_enum", "excluded" boolean NOT NULL, CONSTRAINT "CHK_43d4aad3a4dcb59cb2f75fc756" CHECK (("excluded" = true AND "role" IS NULL) OR ("excluded" = false AND "role" IS NOT NULL)), CONSTRAINT "PK_0fb8f801c3b13f1e567049d8be9" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_fa7ea1c6467cbe47fd63125b33" ON "workspace_team_member_overrides" ("userId") `);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_b88eaa7ce3cdb14bc1ea0df1a0" ON "workspace_team_member_overrides" ("teamGrantId", "userId") `);
        await queryRunner.query(`CREATE TYPE "public"."workspace_members_role_enum" AS ENUM('use', 'edit', 'full')`);
        await queryRunner.query(`CREATE TYPE "public"."workspace_members_status_enum" AS ENUM('pending', 'active')`);
        await queryRunner.query(`CREATE TABLE "workspace_members" ("id" character varying NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "workspaceId" character varying NOT NULL, "userId" character varying NOT NULL, "role" "public"."workspace_members_role_enum" NOT NULL, "status" "public"."workspace_members_status_enum" NOT NULL, CONSTRAINT "PK_22ab43ac5865cd62769121d2bc4" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_22176b38813258c2aadaae3244" ON "workspace_members" ("userId") `);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_99bcb5fdac446371d41f048b24" ON "workspace_members" ("workspaceId", "userId") `);
        await queryRunner.query(`CREATE TYPE "public"."workspaces_visibility_enum" AS ENUM('private', 'organization')`);
        await queryRunner.query(`ALTER TABLE "workspaces" ADD "visibility" "public"."workspaces_visibility_enum" NOT NULL DEFAULT 'private'`);
        await queryRunner.query(`ALTER TABLE "workspace_team_grants" ADD CONSTRAINT "FK_2a8f125b1eff74e097929d3dad0" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "workspace_team_grants" ADD CONSTRAINT "FK_2ff4d832b168963b4db7504e0f3" FOREIGN KEY ("teamId") REFERENCES "teams"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "workspace_team_member_overrides" ADD CONSTRAINT "FK_b5ed356f692bf317c7292ddfd3d" FOREIGN KEY ("teamGrantId") REFERENCES "workspace_team_grants"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "workspace_team_member_overrides" ADD CONSTRAINT "FK_fa7ea1c6467cbe47fd63125b332" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "workspace_members" ADD CONSTRAINT "FK_0dd45cb52108d0664df4e7e33e6" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "workspace_members" ADD CONSTRAINT "FK_22176b38813258c2aadaae32448" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "workspace_members" DROP CONSTRAINT "FK_22176b38813258c2aadaae32448"`);
        await queryRunner.query(`ALTER TABLE "workspace_members" DROP CONSTRAINT "FK_0dd45cb52108d0664df4e7e33e6"`);
        await queryRunner.query(`ALTER TABLE "workspace_team_member_overrides" DROP CONSTRAINT "FK_fa7ea1c6467cbe47fd63125b332"`);
        await queryRunner.query(`ALTER TABLE "workspace_team_member_overrides" DROP CONSTRAINT "FK_b5ed356f692bf317c7292ddfd3d"`);
        await queryRunner.query(`ALTER TABLE "workspace_team_grants" DROP CONSTRAINT "FK_2ff4d832b168963b4db7504e0f3"`);
        await queryRunner.query(`ALTER TABLE "workspace_team_grants" DROP CONSTRAINT "FK_2a8f125b1eff74e097929d3dad0"`);
        await queryRunner.query(`ALTER TABLE "workspaces" DROP COLUMN "visibility"`);
        await queryRunner.query(`DROP TYPE "public"."workspaces_visibility_enum"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_99bcb5fdac446371d41f048b24"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_22176b38813258c2aadaae3244"`);
        await queryRunner.query(`DROP TABLE "workspace_members"`);
        await queryRunner.query(`DROP TYPE "public"."workspace_members_status_enum"`);
        await queryRunner.query(`DROP TYPE "public"."workspace_members_role_enum"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_b88eaa7ce3cdb14bc1ea0df1a0"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_fa7ea1c6467cbe47fd63125b33"`);
        await queryRunner.query(`DROP TABLE "workspace_team_member_overrides"`);
        await queryRunner.query(`DROP TYPE "public"."workspace_team_member_overrides_role_enum"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_b1b4f119fda273430a147a8667"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_2ff4d832b168963b4db7504e0f"`);
        await queryRunner.query(`DROP TABLE "workspace_team_grants"`);
        await queryRunner.query(`DROP TYPE "public"."workspace_team_grants_role_enum"`);
    }

}
