import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddMaxDepthToUrlSources1780405663362 implements MigrationInterface {
  name = 'AddMaxDepthToUrlSources1780405663362';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "sources" ADD "maxDepth" integer`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "sources" DROP COLUMN "maxDepth"`);
  }
}
