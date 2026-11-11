import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCustomerProvidedServerUrlToMarketplaceMcpIntegrations1793798964723 implements MigrationInterface {
  name =
    'AddCustomerProvidedServerUrlToMarketplaceMcpIntegrations1793798964723';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "mcp_integrations" ADD "customer_provides_server_url" boolean DEFAULT false`,
    );
    await queryRunner.query(
      `ALTER TABLE "mcp_integrations" ADD "server_url_hint" character varying`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "mcp_integrations" DROP COLUMN "server_url_hint"`,
    );
    await queryRunner.query(
      `ALTER TABLE "mcp_integrations" DROP COLUMN "customer_provides_server_url"`,
    );
  }
}
