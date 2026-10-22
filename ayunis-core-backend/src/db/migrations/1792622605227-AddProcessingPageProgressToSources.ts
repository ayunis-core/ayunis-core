import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddProcessingPageProgressToSources1792622605227 implements MigrationInterface {
  name = 'AddProcessingPageProgressToSources1792622605227';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "sources" ADD "processingPagesTotal" integer`,
    );
    await queryRunner.query(
      `ALTER TABLE "sources" ADD "processingPagesDone" integer`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "sources" DROP COLUMN "processingPagesDone"`,
    );
    await queryRunner.query(
      `ALTER TABLE "sources" DROP COLUMN "processingPagesTotal"`,
    );
  }
}
