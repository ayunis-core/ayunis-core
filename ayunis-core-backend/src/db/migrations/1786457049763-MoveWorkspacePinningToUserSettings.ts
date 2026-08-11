import type { MigrationInterface, QueryRunner } from 'typeorm';

export class MoveWorkspacePinningToUserSettings1786457049763 implements MigrationInterface {
  name = 'MoveWorkspacePinningToUserSettings1786457049763';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "workspace_user_settings" ("id" character varying NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "workspaceId" character varying NOT NULL, "userId" character varying NOT NULL, "isPinned" boolean NOT NULL DEFAULT false, "sortOrder" integer, CONSTRAINT "UQ_workspace_user_settings_workspace_user" UNIQUE ("workspaceId", "userId"), CONSTRAINT "PK_132511d23bc2712f120daecd449" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_08575f620f60e21ba0f0b6d6ff" ON "workspace_user_settings" ("workspaceId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_bcd79942ac06e73f60ad84f5a8" ON "workspace_user_settings" ("userId") `,
    );
    // Every existing workspace is single-owner, so its pin state and manual
    // order become the owner's settings row before the columns disappear.
    // Rows still on the column defaults get no settings row — a missing row
    // already means "unpinned, never ordered", and only the never-ordered
    // state keeps such workspaces sorting last as designed.
    await queryRunner.query(
      `INSERT INTO "workspace_user_settings" ("id", "workspaceId", "userId", "isPinned", "sortOrder")
             SELECT (gen_random_uuid())::character varying, w."id", w."userId", w."isPinned", w."sortOrder"
             FROM "workspaces" w
             WHERE w."isPinned" OR w."sortOrder" <> 0`,
    );
    await queryRunner.query(`ALTER TABLE "workspaces" DROP COLUMN "isPinned"`);
    await queryRunner.query(`ALTER TABLE "workspaces" DROP COLUMN "sortOrder"`);
    await queryRunner.query(
      `ALTER TABLE "workspace_user_settings" ADD CONSTRAINT "FK_08575f620f60e21ba0f0b6d6ff6" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "workspace_user_settings" ADD CONSTRAINT "FK_bcd79942ac06e73f60ad84f5a88" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "workspace_user_settings" DROP CONSTRAINT "FK_bcd79942ac06e73f60ad84f5a88"`,
    );
    await queryRunner.query(
      `ALTER TABLE "workspace_user_settings" DROP CONSTRAINT "FK_08575f620f60e21ba0f0b6d6ff6"`,
    );
    await queryRunner.query(
      `ALTER TABLE "workspaces" ADD "sortOrder" integer NOT NULL DEFAULT '0'`,
    );
    await queryRunner.query(
      `ALTER TABLE "workspaces" ADD "isPinned" boolean NOT NULL DEFAULT false`,
    );
    await queryRunner.query(
      `UPDATE "workspaces" w
             SET "isPinned" = s."isPinned", "sortOrder" = COALESCE(s."sortOrder", 0)
             FROM "workspace_user_settings" s
             WHERE s."workspaceId" = w."id" AND s."userId" = w."userId"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_bcd79942ac06e73f60ad84f5a8"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_08575f620f60e21ba0f0b6d6ff"`,
    );
    await queryRunner.query(`DROP TABLE "workspace_user_settings"`);
  }
}
