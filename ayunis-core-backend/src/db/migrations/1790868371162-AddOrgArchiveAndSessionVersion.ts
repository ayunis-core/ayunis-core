import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddOrgArchiveAndSessionVersion1790868371162 implements MigrationInterface {
  name = 'AddOrgArchiveAndSessionVersion1790868371162';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "orgs" ADD "archived" boolean NOT NULL DEFAULT false`,
    );
    await queryRunner.query(
      `ALTER TABLE "orgs" ADD "sessionVersion" integer NOT NULL DEFAULT '0'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "orgs" DROP COLUMN "sessionVersion"`);
    await queryRunner.query(`ALTER TABLE "orgs" DROP COLUMN "archived"`);
  }
}
