import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddInstructionsToMcpIntegrations1794471848874 implements MigrationInterface {
  name = 'AddInstructionsToMcpIntegrations1794471848874';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "mcp_integrations" ADD "instructions" text`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "mcp_integrations" DROP COLUMN "instructions"`,
    );
  }
}
