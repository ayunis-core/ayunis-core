import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddInternetAccessEnabledToPermittedModels1786535679101 implements MigrationInterface {
  name = 'AddInternetAccessEnabledToPermittedModels1786535679101';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "permitted_models" ADD "internetAccessEnabled" boolean NOT NULL DEFAULT true`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "permitted_models" DROP COLUMN "internetAccessEnabled"`,
    );
  }
}
