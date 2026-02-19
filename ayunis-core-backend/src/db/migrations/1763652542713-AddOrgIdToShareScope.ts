import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddOrgIdToShareScope1763652542713 implements MigrationInterface {
  name = 'AddOrgIdToShareScope1763652542713';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "shares" DROP CONSTRAINT "FK_394b8d90a8d4717d5f5cdf543c7"`,
    );
    await queryRunner.query(
      `ALTER TABLE "share_scopes" ADD "orgId" character varying`,
    );
    await queryRunner.query(
      `ALTER TABLE "share_scopes" ADD CONSTRAINT "FK_39528fc94509356b645e84edb28" FOREIGN KEY ("orgId") REFERENCES "orgs"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "shares" ADD CONSTRAINT "FK_394b8d90a8d4717d5f5cdf543c7" FOREIGN KEY ("agent_id") REFERENCES "agents"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "shares" DROP CONSTRAINT "FK_394b8d90a8d4717d5f5cdf543c7"`,
    );
    await queryRunner.query(
      `ALTER TABLE "share_scopes" DROP CONSTRAINT "FK_39528fc94509356b645e84edb28"`,
    );
    await queryRunner.query(`ALTER TABLE "share_scopes" DROP COLUMN "orgId"`);
    await queryRunner.query(
      `ALTER TABLE "shares" ADD CONSTRAINT "FK_394b8d90a8d4717d5f5cdf543c7" FOREIGN KEY ("agent_id") REFERENCES "agents"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }
}
