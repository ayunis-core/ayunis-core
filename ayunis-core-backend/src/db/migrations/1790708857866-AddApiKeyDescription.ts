import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddApiKeyDescription1790708857866 implements MigrationInterface {
  name = 'AddApiKeyDescription1790708857866';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "api_keys" ADD "description" character varying(500)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "api_keys" DROP COLUMN "description"`);
  }
}
