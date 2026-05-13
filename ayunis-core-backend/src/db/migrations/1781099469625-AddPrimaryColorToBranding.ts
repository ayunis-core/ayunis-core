import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPrimaryColorToBranding1781099469625 implements MigrationInterface {
  name = 'AddPrimaryColorToBranding1781099469625';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "branding" ADD "primaryColor" character varying`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "branding" DROP COLUMN "primaryColor"`,
    );
  }
}
