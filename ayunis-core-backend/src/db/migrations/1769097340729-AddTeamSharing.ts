import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTeamSharing1769097340729 implements MigrationInterface {
  name = 'AddTeamSharing1769097340729';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "share_scopes" ADD "team_id" character varying`,
    );
    await queryRunner.query(
      `ALTER TYPE "public"."share_scopes_scope_type_enum" RENAME TO "share_scopes_scope_type_enum_old"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."share_scopes_scope_type_enum" AS ENUM('org', 'user', 'team')`,
    );
    await queryRunner.query(
      `ALTER TABLE "share_scopes" ALTER COLUMN "scope_type" TYPE "public"."share_scopes_scope_type_enum" USING "scope_type"::"text"::"public"."share_scopes_scope_type_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE "public"."share_scopes_scope_type_enum_old"`,
    );
    await queryRunner.query(
      `ALTER TABLE "share_scopes" ADD CONSTRAINT "FK_7d18e4da60ee6666a761ed1b6da" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "share_scopes" DROP CONSTRAINT "FK_7d18e4da60ee6666a761ed1b6da"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."share_scopes_scope_type_enum_old" AS ENUM('org', 'user')`,
    );
    await queryRunner.query(
      `ALTER TABLE "share_scopes" ALTER COLUMN "scope_type" TYPE "public"."share_scopes_scope_type_enum_old" USING "scope_type"::"text"::"public"."share_scopes_scope_type_enum_old"`,
    );
    await queryRunner.query(
      `DROP TYPE "public"."share_scopes_scope_type_enum"`,
    );
    await queryRunner.query(
      `ALTER TYPE "public"."share_scopes_scope_type_enum_old" RENAME TO "share_scopes_scope_type_enum"`,
    );
    await queryRunner.query(`ALTER TABLE "share_scopes" DROP COLUMN "team_id"`);
  }
}
