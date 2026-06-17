import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddDepartmentToUsers1773675804016 implements MigrationInterface {
  name = 'AddDepartmentToUsers1773675804016';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" ADD "department" character varying`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "department"`);
  }
}
