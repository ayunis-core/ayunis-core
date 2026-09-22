import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddContextWindowSizeToLanguageModels1790086821048 implements MigrationInterface {
  name = 'AddContextWindowSizeToLanguageModels1790086821048';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "models" ADD "contextWindowSize" integer`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "models" DROP COLUMN "contextWindowSize"`,
    );
  }
}
