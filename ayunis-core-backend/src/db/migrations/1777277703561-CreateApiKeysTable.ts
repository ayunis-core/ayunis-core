import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateApiKeysTable1777277703561 implements MigrationInterface {
  name = 'CreateApiKeysTable1777277703561';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "api_keys" ("id" character varying NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "name" character varying(100) NOT NULL, "prefix" character varying NOT NULL, "hash" character varying NOT NULL, "expires_at" TIMESTAMP WITH TIME ZONE, "org_id" character varying NOT NULL, "created_by_user_id" character varying, CONSTRAINT "PK_5c8a79801b44bd27b79228e1dad" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_6f6105c8efe05b310d046cbdb3" ON "api_keys" ("prefix") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_ba7f5748f500d24aa18041d043" ON "api_keys" ("org_id") `,
    );
    await queryRunner.query(
      `ALTER TABLE "api_keys" ADD CONSTRAINT "FK_ba7f5748f500d24aa18041d0439" FOREIGN KEY ("org_id") REFERENCES "orgs"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "api_keys" ADD CONSTRAINT "FK_522917da2d9d41d41f7a4e367f0" FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "api_keys" DROP CONSTRAINT "FK_522917da2d9d41d41f7a4e367f0"`,
    );
    await queryRunner.query(
      `ALTER TABLE "api_keys" DROP CONSTRAINT "FK_ba7f5748f500d24aa18041d0439"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_ba7f5748f500d24aa18041d043"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_6f6105c8efe05b310d046cbdb3"`,
    );
    await queryRunner.query(`DROP TABLE "api_keys"`);
  }
}
