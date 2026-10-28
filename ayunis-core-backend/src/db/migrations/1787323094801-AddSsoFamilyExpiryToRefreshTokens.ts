import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSsoFamilyExpiryToRefreshTokens1787323094801 implements MigrationInterface {
  name = 'AddSsoFamilyExpiryToRefreshTokens1787323094801';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "refresh_tokens" ADD "familyExpiresAt" TIMESTAMP WITH TIME ZONE`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "refresh_tokens" DROP COLUMN "familyExpiresAt"`,
    );
  }
}
