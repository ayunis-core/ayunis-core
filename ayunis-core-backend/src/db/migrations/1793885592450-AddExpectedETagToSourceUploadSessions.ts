import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddExpectedETagToSourceUploadSessions1793885592450 implements MigrationInterface {
  name = 'AddExpectedETagToSourceUploadSessions1793885592450';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "source_upload_sessions" ADD "expectedETag" character varying`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "source_upload_sessions" DROP COLUMN "expectedETag"`,
    );
  }
}
