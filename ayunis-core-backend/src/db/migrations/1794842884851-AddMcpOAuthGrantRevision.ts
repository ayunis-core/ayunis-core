import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddMcpOAuthGrantRevision1794842884851 implements MigrationInterface {
  name = 'AddMcpOAuthGrantRevision1794842884851';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "mcp_oauth_user_tokens" ADD "grant_revision" uuid NOT NULL DEFAULT gen_random_uuid()`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "mcp_oauth_user_tokens" DROP COLUMN "grant_revision"`,
    );
  }
}
