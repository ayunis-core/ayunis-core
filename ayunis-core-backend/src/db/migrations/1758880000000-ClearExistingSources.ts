import type { MigrationInterface, QueryRunner } from 'typeorm';

export class ClearExistingSources1758880000000 implements MigrationInterface {
  name = 'ClearExistingSources1758880000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `TRUNCATE TABLE "thread_source_assignments", "agent_source_assignments", "sources" CASCADE`,
    );
  }

  public async down(): Promise<void> {
    // data deletion is irreversible
  }
}
