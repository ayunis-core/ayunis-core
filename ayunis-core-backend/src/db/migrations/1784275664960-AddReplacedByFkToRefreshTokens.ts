import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddReplacedByFkToRefreshTokens1784275664960 implements MigrationInterface {
  name = 'AddReplacedByFkToRefreshTokens1784275664960';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "refresh_tokens" ADD CONSTRAINT "FK_6077443266dc1dde0ac43b6f727" FOREIGN KEY ("replacedByTokenId") REFERENCES "refresh_tokens"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "refresh_tokens" DROP CONSTRAINT "FK_6077443266dc1dde0ac43b6f727"`,
    );
  }
}
