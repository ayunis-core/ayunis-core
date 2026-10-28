import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddDefaultUserCreditLimit1791301772155 implements MigrationInterface {
  name = 'AddDefaultUserCreditLimit1791301772155';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_1926f860f7a2e0fb75b27198ad" ON "credit_limits" ("orgId") WHERE "scope" = 'USER_DEFAULT'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "public"."IDX_1926f860f7a2e0fb75b27198ad"`,
    );
  }
}
