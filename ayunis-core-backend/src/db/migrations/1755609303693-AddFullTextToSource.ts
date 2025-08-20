import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddFullTextToSource1755609303693 implements MigrationInterface {
  name = 'AddFullTextToSource1755609303693';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "sources" ADD "text" character varying`,
    );
    await queryRunner.query(
      `UPDATE "sources" SET "text" = '' WHERE "text" IS NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "sources" ALTER COLUMN "text" SET NOT NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "sources" DROP COLUMN "text"`);
  }
}
