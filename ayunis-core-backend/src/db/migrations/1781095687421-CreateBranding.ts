import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateBranding1781095687421 implements MigrationInterface {
  name = 'CreateBranding1781095687421';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "branding" ("id" character varying NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "orgId" character varying NOT NULL, "displayName" character varying, "faviconStoragePath" character varying, CONSTRAINT "UQ_92d399db71cdc9938d8ce56f0ff" UNIQUE ("orgId"), CONSTRAINT "REL_92d399db71cdc9938d8ce56f0f" UNIQUE ("orgId"), CONSTRAINT "PK_e25f376c40ba766f4008a88bbc9" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "branding" ADD CONSTRAINT "FK_92d399db71cdc9938d8ce56f0ff" FOREIGN KEY ("orgId") REFERENCES "orgs"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "branding" DROP CONSTRAINT "FK_92d399db71cdc9938d8ce56f0ff"`,
    );
    await queryRunner.query(`DROP TABLE "branding"`);
  }
}
