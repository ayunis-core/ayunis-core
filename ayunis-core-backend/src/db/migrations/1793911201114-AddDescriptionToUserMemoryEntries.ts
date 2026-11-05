import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddDescriptionToUserMemoryEntries1793911201114 implements MigrationInterface {
  name = 'AddDescriptionToUserMemoryEntries1793911201114';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "user_memory_entries" ADD "description" character varying(150)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "user_memory_entries" DROP COLUMN "description"`,
    );
  }
}
