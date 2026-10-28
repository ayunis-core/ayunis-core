import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AllowFederatedUsersAndTrackSessionAuthentication1786453448049 implements MigrationInterface {
  name = 'AllowFederatedUsersAndTrackSessionAuthentication1786453448049';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."refresh_tokens_authenticationmethod_enum" AS ENUM('password', 'sso')`,
    );
    await queryRunner.query(
      `ALTER TABLE "refresh_tokens" ADD "authenticationMethod" "public"."refresh_tokens_authenticationmethod_enum" NOT NULL DEFAULT 'password'`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ALTER COLUMN "passwordHash" DROP NOT NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" ALTER COLUMN "passwordHash" SET NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "refresh_tokens" DROP COLUMN "authenticationMethod"`,
    );
    await queryRunner.query(
      `DROP TYPE "public"."refresh_tokens_authenticationmethod_enum"`,
    );
  }
}
