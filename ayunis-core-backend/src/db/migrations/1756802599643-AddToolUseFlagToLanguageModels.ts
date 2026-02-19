import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddToolUseFlagToLanguageModels1756802599643
  implements MigrationInterface
{
  name = 'AddToolUseFlagToLanguageModels1756802599643';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "models" ADD "canUseTools" boolean DEFAULT true`,
    );
    await queryRunner.query(
      `ALTER TABLE "models" ALTER COLUMN "canStream" SET DEFAULT true`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "models" ALTER COLUMN "canStream" SET DEFAULT false`,
    );
    await queryRunner.query(`ALTER TABLE "models" DROP COLUMN "canUseTools"`);
  }
}
