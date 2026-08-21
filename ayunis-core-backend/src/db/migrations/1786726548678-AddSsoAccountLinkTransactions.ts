import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSsoAccountLinkTransactions1786726548678 implements MigrationInterface {
  name = 'AddSsoAccountLinkTransactions1786726548678';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."sso_login_transactions_purpose_enum" AS ENUM('login', 'link')`,
    );
    await queryRunner.query(
      `ALTER TABLE "sso_login_transactions" ADD "purpose" "public"."sso_login_transactions_purpose_enum" NOT NULL DEFAULT 'login'`,
    );
    await queryRunner.query(
      `ALTER TABLE "sso_login_transactions" ADD "link_user_id" character varying`,
    );
    await queryRunner.query(
      `ALTER TABLE "sso_login_transactions" ADD CONSTRAINT "CHK_94bef58b964df53f97ffbfff0c" CHECK ((purpose = 'login' AND link_user_id IS NULL) OR (purpose = 'link' AND link_user_id IS NOT NULL))`,
    );
    await queryRunner.query(
      `ALTER TABLE "sso_login_transactions" ADD CONSTRAINT "FK_9ab4fe2c734fe6c9b93a18e6c05" FOREIGN KEY ("link_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "sso_login_transactions" DROP CONSTRAINT "FK_9ab4fe2c734fe6c9b93a18e6c05"`,
    );
    await queryRunner.query(
      `ALTER TABLE "sso_login_transactions" DROP CONSTRAINT "CHK_94bef58b964df53f97ffbfff0c"`,
    );
    await queryRunner.query(
      `ALTER TABLE "sso_login_transactions" DROP COLUMN "link_user_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "sso_login_transactions" DROP COLUMN "purpose"`,
    );
    await queryRunner.query(
      `DROP TYPE "public"."sso_login_transactions_purpose_enum"`,
    );
  }
}
