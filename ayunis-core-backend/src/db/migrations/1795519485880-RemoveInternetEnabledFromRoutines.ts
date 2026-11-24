import type { MigrationInterface, QueryRunner } from 'typeorm';

export class RemoveInternetEnabledFromRoutines1795519485880 implements MigrationInterface {
  name = 'RemoveInternetEnabledFromRoutines1795519485880';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "routines" DROP COLUMN "internetEnabled"`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "routines" ADD "internetEnabled" boolean NOT NULL DEFAULT false`,
    );
  }
}
