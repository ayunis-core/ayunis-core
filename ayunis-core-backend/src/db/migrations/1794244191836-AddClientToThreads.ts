import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddClientToThreads1794244191836 implements MigrationInterface {
  name = 'AddClientToThreads1794244191836';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "threads" ADD "client" character varying`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "threads" DROP COLUMN "client"`);
  }
}
