import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateIpAllowlistsTable1773679166381 implements MigrationInterface {
  name = 'CreateIpAllowlistsTable1773679166381';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "ip_allowlists" ("id" character varying NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "orgId" character varying NOT NULL, "cidrs" text array NOT NULL, CONSTRAINT "UQ_cad8648bacddda154a2ad01050a" UNIQUE ("orgId"), CONSTRAINT "PK_75b3501315ecd2c3ce0d253ea51" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "ip_allowlists" ADD CONSTRAINT "FK_cad8648bacddda154a2ad01050a" FOREIGN KEY ("orgId") REFERENCES "orgs"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "ip_allowlists" DROP CONSTRAINT "FK_cad8648bacddda154a2ad01050a"`,
    );
    await queryRunner.query(`DROP TABLE "ip_allowlists"`);
  }
}
