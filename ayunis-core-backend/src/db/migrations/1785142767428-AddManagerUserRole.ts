import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddManagerUserRole1785142767428 implements MigrationInterface {
  name = 'AddManagerUserRole1785142767428';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TYPE "public"."users_role_enum" RENAME TO "users_role_enum_old"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."users_role_enum" AS ENUM('admin', 'manager', 'user')`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ALTER COLUMN "role" TYPE "public"."users_role_enum" USING "role"::"text"::"public"."users_role_enum"`,
    );
    await queryRunner.query(`DROP TYPE "public"."users_role_enum_old"`);
    await queryRunner.query(
      `ALTER TYPE "public"."invites_role_enum" RENAME TO "invites_role_enum_old"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."invites_role_enum" AS ENUM('admin', 'manager', 'user')`,
    );
    await queryRunner.query(
      `ALTER TABLE "invites" ALTER COLUMN "role" TYPE "public"."invites_role_enum" USING "role"::"text"::"public"."invites_role_enum"`,
    );
    await queryRunner.query(`DROP TYPE "public"."invites_role_enum_old"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."invites_role_enum_old" AS ENUM('admin', 'user')`,
    );
    await queryRunner.query(
      `ALTER TABLE "invites" ALTER COLUMN "role" TYPE "public"."invites_role_enum_old" USING "role"::"text"::"public"."invites_role_enum_old"`,
    );
    await queryRunner.query(`DROP TYPE "public"."invites_role_enum"`);
    await queryRunner.query(
      `ALTER TYPE "public"."invites_role_enum_old" RENAME TO "invites_role_enum"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."users_role_enum_old" AS ENUM('admin', 'user')`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ALTER COLUMN "role" TYPE "public"."users_role_enum_old" USING "role"::"text"::"public"."users_role_enum_old"`,
    );
    await queryRunner.query(`DROP TYPE "public"."users_role_enum"`);
    await queryRunner.query(
      `ALTER TYPE "public"."users_role_enum_old" RENAME TO "users_role_enum"`,
    );
  }
}
