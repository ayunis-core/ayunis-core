import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddClientToRefreshTokens1794239829838 implements MigrationInterface {
  name = 'AddClientToRefreshTokens1794239829838';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "refresh_tokens" ADD "client" character varying`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "refresh_tokens" DROP COLUMN "client"`,
    );
  }
}
