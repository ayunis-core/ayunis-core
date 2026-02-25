import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddDescriptionToMcpIntegrations1772042719812
  implements MigrationInterface
{
  name = 'AddDescriptionToMcpIntegrations1772042719812';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "mcp_integrations" ADD "description" text`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "mcp_integrations" DROP COLUMN "description"`,
    );
  }
}
