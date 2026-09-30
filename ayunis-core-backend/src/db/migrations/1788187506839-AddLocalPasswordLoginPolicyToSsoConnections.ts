import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddLocalPasswordLoginPolicyToSsoConnections1788187506839 implements MigrationInterface {
  name = 'AddLocalPasswordLoginPolicyToSsoConnections1788187506839';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "org_sso_connections" ADD "localPasswordLoginEnabled" boolean NOT NULL DEFAULT true`,
    );
    await queryRunner.query(
      `ALTER TABLE "org_sso_connections" ADD CONSTRAINT "CHK_b4f40e3536c6eb78f244582164" CHECK ("localPasswordLoginEnabled" OR "enabled")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "org_sso_connections" DROP CONSTRAINT "CHK_b4f40e3536c6eb78f244582164"`,
    );
    await queryRunner.query(
      `ALTER TABLE "org_sso_connections" DROP COLUMN "localPasswordLoginEnabled"`,
    );
  }
}
