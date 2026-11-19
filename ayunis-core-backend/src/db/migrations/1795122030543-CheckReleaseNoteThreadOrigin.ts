import { MigrationInterface, QueryRunner } from 'typeorm';

export class CheckReleaseNoteThreadOrigin1795122030543 implements MigrationInterface {
  name = 'CheckReleaseNoteThreadOrigin1795122030543';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "threads" ADD CONSTRAINT "CHK_3a8c4bebdc039f2d9563b6edeb" CHECK ("sourceReleaseNoteId" IS NULL OR "origin" = 'release_note')`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "threads" DROP CONSTRAINT "CHK_3a8c4bebdc039f2d9563b6edeb"`,
    );
  }
}
