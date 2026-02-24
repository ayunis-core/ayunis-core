import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddLogoUrlToMcpIntegrations1771928227556
  implements MigrationInterface
{
  name = 'AddLogoUrlToMcpIntegrations1771928227556';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "mcp_integrations" ADD "logo_url" character varying`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "mcp_integrations" DROP COLUMN "logo_url"`,
    );
  }
}
