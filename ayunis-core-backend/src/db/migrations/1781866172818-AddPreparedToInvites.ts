import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPreparedToInvites1781866172818 implements MigrationInterface {
  name = 'AddPreparedToInvites1781866172818';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "invites" ADD "prepared" boolean NOT NULL DEFAULT false`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "invites" DROP COLUMN "prepared"`);
  }
}
