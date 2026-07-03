import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddDescriptionToLanguageModels1783066524954 implements MigrationInterface {
  name = 'AddDescriptionToLanguageModels1783066524954';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "models" ADD "description" text`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "models" DROP COLUMN "description"`);
  }
}
