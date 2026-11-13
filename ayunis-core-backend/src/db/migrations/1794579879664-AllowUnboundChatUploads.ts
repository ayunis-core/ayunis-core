import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AllowUnboundChatUploads1794579879664 implements MigrationInterface {
  name = 'AllowUnboundChatUploads1794579879664';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "source_upload_sessions" ALTER COLUMN "targetId" DROP NOT NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "source_upload_sessions" ALTER COLUMN "targetId" SET NOT NULL`,
    );
  }
}
