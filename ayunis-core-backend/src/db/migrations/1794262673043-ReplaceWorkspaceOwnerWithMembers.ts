import type { MigrationInterface, QueryRunner } from 'typeorm';

export class ReplaceWorkspaceOwnerWithMembers1794262673043 implements MigrationInterface {
  name = 'ReplaceWorkspaceOwnerWithMembers1794262673043';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."workspace_members_role_enum" AS ENUM('admin', 'manager', 'user')`,
    );
    await queryRunner.query(
      `CREATE TABLE "workspace_members" ("id" character varying NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "workspaceId" character varying NOT NULL, "userId" character varying NOT NULL, "role" "public"."workspace_members_role_enum" NOT NULL, CONSTRAINT "UQ_99bcb5fdac446371d41f048b24f" UNIQUE ("workspaceId", "userId"), CONSTRAINT "PK_22ab43ac5865cd62769121d2bc4" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_22176b38813258c2aadaae3244" ON "workspace_members" ("userId") `,
    );
    await queryRunner.query(
      `ALTER TABLE "workspace_members" ADD CONSTRAINT "FK_0dd45cb52108d0664df4e7e33e6" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "workspace_members" ADD CONSTRAINT "FK_22176b38813258c2aadaae32448" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    // The membership starts with the workspace, so the owner stays the
    // longest-standing member when account deletion picks a successor.
    await queryRunner.query(
      `INSERT INTO "workspace_members" ("id", "createdAt", "updatedAt", "workspaceId", "userId", "role") SELECT gen_random_uuid()::varchar, "createdAt", "createdAt", "id", "userId", 'admin' FROM "workspaces"`,
    );
    await queryRunner.query(
      `ALTER TABLE "workspaces" DROP CONSTRAINT "FK_dc53b3d0b16419a8f5f17458403"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_dc53b3d0b16419a8f5f1745840"`,
    );
    await queryRunner.query(`ALTER TABLE "workspaces" DROP COLUMN "userId"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "workspaces" ADD "userId" character varying`,
    );
    // The earliest admin becomes the owner. Falling back to the earliest
    // member covers a workspace whose successor promotion failed; a workspace
    // without any member has no owner to restore and fails SET NOT NULL.
    await queryRunner.query(
      `UPDATE "workspaces" SET "userId" = (SELECT "member"."userId" FROM "workspace_members" "member" WHERE "member"."workspaceId" = "workspaces"."id" ORDER BY "member"."role" = 'admin' DESC, "member"."createdAt", "member"."id" LIMIT 1)`,
    );
    await queryRunner.query(
      `ALTER TABLE "workspaces" ALTER COLUMN "userId" SET NOT NULL`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_dc53b3d0b16419a8f5f1745840" ON "workspaces" ("userId") `,
    );
    await queryRunner.query(
      `ALTER TABLE "workspaces" ADD CONSTRAINT "FK_dc53b3d0b16419a8f5f17458403" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "workspace_members" DROP CONSTRAINT "FK_22176b38813258c2aadaae32448"`,
    );
    await queryRunner.query(
      `ALTER TABLE "workspace_members" DROP CONSTRAINT "FK_0dd45cb52108d0664df4e7e33e6"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_22176b38813258c2aadaae3244"`,
    );
    await queryRunner.query(`DROP TABLE "workspace_members"`);
    await queryRunner.query(`DROP TYPE "public"."workspace_members_role_enum"`);
  }
}
