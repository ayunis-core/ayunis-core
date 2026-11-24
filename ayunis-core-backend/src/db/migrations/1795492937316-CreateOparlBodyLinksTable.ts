import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateOparlBodyLinksTable1795492937316 implements MigrationInterface {
  name = 'CreateOparlBodyLinksTable1795492937316';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "oparl_body_links" ("id" character varying NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "orgId" character varying NOT NULL, "bodyId" character varying NOT NULL, "linkedByUserId" character varying, CONSTRAINT "UQ_e58ebc39b8eb4bcd9db8727296c" UNIQUE ("orgId", "bodyId"), CONSTRAINT "PK_c47d4d6c8cc01f54aeb7137adb0" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_d1eaaa621ee326aeb3ee80041d" ON "oparl_body_links" ("bodyId") `,
    );
    await queryRunner.query(
      `ALTER TABLE "oparl_body_links" ADD CONSTRAINT "FK_b99f122c0cdd37da20cf45aacb2" FOREIGN KEY ("orgId") REFERENCES "orgs"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "oparl_body_links" ADD CONSTRAINT "FK_d1eaaa621ee326aeb3ee80041d1" FOREIGN KEY ("bodyId") REFERENCES "oparl_bodies"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "oparl_body_links" ADD CONSTRAINT "FK_61c699bd25709e91d579d0e0751" FOREIGN KEY ("linkedByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "oparl_body_links" DROP CONSTRAINT "FK_61c699bd25709e91d579d0e0751"`,
    );
    await queryRunner.query(
      `ALTER TABLE "oparl_body_links" DROP CONSTRAINT "FK_d1eaaa621ee326aeb3ee80041d1"`,
    );
    await queryRunner.query(
      `ALTER TABLE "oparl_body_links" DROP CONSTRAINT "FK_b99f122c0cdd37da20cf45aacb2"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_d1eaaa621ee326aeb3ee80041d"`,
    );
    await queryRunner.query(`DROP TABLE "oparl_body_links"`);
  }
}
