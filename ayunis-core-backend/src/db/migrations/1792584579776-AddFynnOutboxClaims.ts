import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddFynnOutboxClaims1792584579776 implements MigrationInterface {
  name = 'AddFynnOutboxClaims1792584579776';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "fynn_outbox" ADD "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()`,
    );
    await queryRunner.query(`ALTER TABLE "fynn_outbox" ADD "claimToken" uuid`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "fynn_outbox" DROP COLUMN "claimToken"`,
    );
    await queryRunner.query(
      `ALTER TABLE "fynn_outbox" DROP COLUMN "createdAt"`,
    );
  }
}
