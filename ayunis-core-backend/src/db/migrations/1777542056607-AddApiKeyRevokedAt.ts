import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddApiKeyRevokedAt1777542056607 implements MigrationInterface {
  name = 'AddApiKeyRevokedAt1777542056607';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "api_keys" ADD "revoked_at" TIMESTAMP WITH TIME ZONE`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "api_keys" DROP COLUMN "revoked_at"`);
  }
}
