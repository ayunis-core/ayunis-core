import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCreatedByLLMFlagToSource1759761322612
  implements MigrationInterface
{
  name = 'AddCreatedByLLMFlagToSource1759761322612';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "sources" ADD "createdByLLM" boolean NOT NULL DEFAULT false`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "sources" DROP COLUMN "createdByLLM"`);
  }
}
