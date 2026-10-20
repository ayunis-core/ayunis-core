import type { MigrationInterface, QueryRunner } from 'typeorm';

export class RequireContextWindowSizeForLanguageModels1792416285770 implements MigrationInterface {
  name = 'RequireContextWindowSizeForLanguageModels1792416285770';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            UPDATE "models"
            SET "contextWindowSize" = 200000
            WHERE "type" = 'language' AND "contextWindowSize" IS NULL
        `);
    await queryRunner.query(
      `ALTER TABLE "models" ADD CONSTRAINT "CHK_cc21f73f0175739c2875b63665" CHECK ("type" <> 'language' OR "contextWindowSize" IS NOT NULL)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "models" DROP CONSTRAINT "CHK_cc21f73f0175739c2875b63665"`,
    );
  }
}
