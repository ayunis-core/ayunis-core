import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddZitadelIdpIdToOrgSsoConnections1787827000000 implements MigrationInterface {
  name = 'AddZitadelIdpIdToOrgSsoConnections1787827000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "org_sso_connections" ADD "zitadelIdpId" character varying(255)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "org_sso_connections" DROP COLUMN "zitadelIdpId"`,
    );
  }
}
