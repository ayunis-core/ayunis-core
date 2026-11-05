import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddMemoryEnabledToOrgChatSettings1793909522666 implements MigrationInterface {
  name = 'AddMemoryEnabledToOrgChatSettings1793909522666';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "org_chat_settings" ADD "memoryEnabled" boolean NOT NULL DEFAULT false`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "org_chat_settings" DROP COLUMN "memoryEnabled"`,
    );
  }
}
