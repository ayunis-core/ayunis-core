import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSourceStorageKey1793779041990 implements MigrationInterface {
  name = 'AddSourceStorageKey1793779041990';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "sources" ADD "storageKey" character varying`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_sources_storageKey" ON "sources" ("storageKey") `,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."IDX_sources_storageKey"`);
    await queryRunner.query(`ALTER TABLE "sources" DROP COLUMN "storageKey"`);
  }
}
