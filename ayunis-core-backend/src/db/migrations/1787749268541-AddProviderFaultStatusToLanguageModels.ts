import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddProviderFaultStatusToLanguageModels1787749268541 implements MigrationInterface {
  name = 'AddProviderFaultStatusToLanguageModels1787749268541';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "models" ADD "hasProviderFault" boolean DEFAULT false`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "models" DROP COLUMN "hasProviderFault"`,
    );
  }
}
