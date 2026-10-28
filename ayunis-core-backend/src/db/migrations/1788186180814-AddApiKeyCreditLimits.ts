import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddApiKeyCreditLimits1788186180814 implements MigrationInterface {
  name = 'AddApiKeyCreditLimits1788186180814';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "credit_limits" ADD "apiKeyId" character varying`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_a472ec4e5c89adcc67b7e06a2a" ON "credit_limits" ("orgId", "apiKeyId") WHERE "apiKeyId" IS NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "credit_limits" ADD CONSTRAINT "FK_a9b07bbb6f296e389a119935601" FOREIGN KEY ("apiKeyId") REFERENCES "api_keys"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "credit_limits" DROP CONSTRAINT "FK_a9b07bbb6f296e389a119935601"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_a472ec4e5c89adcc67b7e06a2a"`,
    );
    await queryRunner.query(
      `ALTER TABLE "credit_limits" DROP COLUMN "apiKeyId"`,
    );
  }
}
