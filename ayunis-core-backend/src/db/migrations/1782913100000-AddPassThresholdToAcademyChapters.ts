import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPassThresholdToAcademyChapters1782913100000
  implements MigrationInterface
{
  name = 'AddPassThresholdToAcademyChapters1782913100000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "academy_chapters" ADD "passThreshold" integer NOT NULL DEFAULT 80`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "academy_chapters" DROP COLUMN "passThreshold"`,
    );
  }
}
