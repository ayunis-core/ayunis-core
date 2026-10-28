import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAnonymousModeByDefaultToOrgChatSettings1790779686146 implements MigrationInterface {
  name = 'AddAnonymousModeByDefaultToOrgChatSettings1790779686146';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "org_chat_settings" ADD "anonymousModeByDefault" boolean NOT NULL DEFAULT false`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "org_chat_settings" DROP COLUMN "anonymousModeByDefault"`,
    );
  }
}
