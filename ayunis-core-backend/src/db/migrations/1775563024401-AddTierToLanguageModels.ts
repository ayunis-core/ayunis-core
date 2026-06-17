import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTierToLanguageModels1775563024401 implements MigrationInterface {
  name = 'AddTierToLanguageModels1775563024401';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "models" ADD "tier" character varying`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "models" DROP COLUMN "tier"`);
  }
}
