import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSourceProcessingErrorCode1790694911456 implements MigrationInterface {
  name = 'AddSourceProcessingErrorCode1790694911456';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "sources" ADD "processingErrorCode" character varying`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "sources" DROP COLUMN "processingErrorCode"`,
    );
  }
}
