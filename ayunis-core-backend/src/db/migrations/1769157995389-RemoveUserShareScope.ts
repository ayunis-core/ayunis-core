import { MigrationInterface, QueryRunner } from 'typeorm';

export class RemoveUserShareScope1769157995389 implements MigrationInterface {
  name = 'RemoveUserShareScope1769157995389';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Delete existing 'user' scope records before removing the enum value
    await queryRunner.query(
      `DELETE FROM "share_scopes" WHERE "scope_type" = 'user'`,
    );

    await queryRunner.query(
      `ALTER TYPE "public"."share_scopes_scope_type_enum" RENAME TO "share_scopes_scope_type_enum_old"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."share_scopes_scope_type_enum" AS ENUM('org', 'team')`,
    );
    await queryRunner.query(
      `ALTER TABLE "share_scopes" ALTER COLUMN "scope_type" TYPE "public"."share_scopes_scope_type_enum" USING "scope_type"::"text"::"public"."share_scopes_scope_type_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE "public"."share_scopes_scope_type_enum_old"`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."share_scopes_scope_type_enum_old" AS ENUM('org', 'user', 'team')`,
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
  }
}
