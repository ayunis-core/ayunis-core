import type { MigrationInterface, QueryRunner } from 'typeorm';

export class RemoveCurrencyColumns1773331092929 implements MigrationInterface {
  name = 'RemoveCurrencyColumns1773331092929';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "models" DROP COLUMN "currency"`);
    await queryRunner.query(`DROP TYPE "public"."models_currency_enum"`);
    await queryRunner.query(`ALTER TABLE "usage" DROP COLUMN "currency"`);
    await queryRunner.query(`DROP TYPE "public"."usage_currency_enum"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."usage_currency_enum" AS ENUM('EUR', 'USD')`,
    );
    await queryRunner.query(
      `ALTER TABLE "usage" ADD "currency" "public"."usage_currency_enum"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."models_currency_enum" AS ENUM('EUR', 'USD')`,
    );
    await queryRunner.query(
      `ALTER TABLE "models" ADD "currency" "public"."models_currency_enum"`,
    );
  }
}
