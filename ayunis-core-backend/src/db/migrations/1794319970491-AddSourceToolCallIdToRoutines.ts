import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSourceToolCallIdToRoutines1794319970491 implements MigrationInterface {
  name = 'AddSourceToolCallIdToRoutines1794319970491';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "routines" ADD "sourceToolCallId" character varying(255)`,
    );
    await queryRunner.query(
      `ALTER TABLE "routines" ADD CONSTRAINT "UQ_a0de4c1006ecf45c4496a580a20" UNIQUE ("userId", "sourceToolCallId")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "routines" DROP CONSTRAINT "UQ_a0de4c1006ecf45c4496a580a20"`,
    );
    await queryRunner.query(
      `ALTER TABLE "routines" DROP COLUMN "sourceToolCallId"`,
    );
  }
}
