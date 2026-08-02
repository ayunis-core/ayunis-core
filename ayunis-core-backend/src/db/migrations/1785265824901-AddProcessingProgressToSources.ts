import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddProcessingProgressToSources1785265824901 implements MigrationInterface {
  name = 'AddProcessingProgressToSources1785265824901';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "sources" ADD "processingProgress" jsonb`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "sources" DROP COLUMN "processingProgress"`,
    );
  }
}
