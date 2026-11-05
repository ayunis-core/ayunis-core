import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSourceStorageKey1793779041990 implements MigrationInterface {
  name = 'AddSourceStorageKey1793779041990';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "sources" ADD "storageKey" character varying`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "sources" DROP COLUMN "storageKey"`);
  }
}
