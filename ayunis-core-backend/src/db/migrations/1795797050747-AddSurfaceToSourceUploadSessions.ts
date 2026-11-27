import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSurfaceToSourceUploadSessions1795797050747 implements MigrationInterface {
  name = 'AddSurfaceToSourceUploadSessions1795797050747';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "source_upload_sessions" ADD "surface" character varying`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "source_upload_sessions" DROP COLUMN "surface"`,
    );
  }
}
