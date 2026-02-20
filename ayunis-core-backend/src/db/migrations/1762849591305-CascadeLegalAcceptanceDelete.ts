import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CascadeLegalAcceptanceDelete1762849591305
  implements MigrationInterface
{
  name = 'CascadeLegalAcceptanceDelete1762849591305';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "legal_acceptances" DROP CONSTRAINT "FK_9a4e88eb711d5e3395d45a9feb1"`,
    );
    await queryRunner.query(
      `ALTER TABLE "legal_acceptances" ADD CONSTRAINT "FK_9a4e88eb711d5e3395d45a9feb1" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "legal_acceptances" DROP CONSTRAINT "FK_9a4e88eb711d5e3395d45a9feb1"`,
    );
    await queryRunner.query(
      `ALTER TABLE "legal_acceptances" ADD CONSTRAINT "FK_9a4e88eb711d5e3395d45a9feb1" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }
}
