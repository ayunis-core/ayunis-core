import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddMarketplaceIdentifierToRoutines1795541221493 implements MigrationInterface {
  name = 'AddMarketplaceIdentifierToRoutines1795541221493';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "routines" ADD "marketplaceIdentifier" character varying(255)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "routines" DROP COLUMN "marketplaceIdentifier"`,
    );
  }
}
