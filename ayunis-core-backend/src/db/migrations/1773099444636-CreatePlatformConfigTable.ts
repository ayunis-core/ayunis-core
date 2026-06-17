import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CreatePlatformConfigTable1773099444636 implements MigrationInterface {
  name = 'CreatePlatformConfigTable1773099444636';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "platform_config" ("key" character varying NOT NULL, "value" character varying NOT NULL, CONSTRAINT "PK_e288d39f7103fdc2a057f96b62e" PRIMARY KEY ("key"))`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "platform_config"`);
  }
}
