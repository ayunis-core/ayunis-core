import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPiiFlagToMcpIntegrationAndThread1764328586586
  implements MigrationInterface
{
  name = 'AddPiiFlagToMcpIntegrationAndThread1764328586586';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "mcp_integrations" ADD "returnsPii" boolean NOT NULL DEFAULT true`,
    );
    await queryRunner.query(
      `ALTER TABLE "threads" ADD "isAnonymous" boolean NOT NULL DEFAULT false`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "threads" DROP COLUMN "isAnonymous"`);
    await queryRunner.query(
      `ALTER TABLE "mcp_integrations" DROP COLUMN "returnsPii"`,
    );
  }
}
