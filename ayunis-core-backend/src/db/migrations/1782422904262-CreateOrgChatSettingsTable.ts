import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateOrgChatSettingsTable1782422904262 implements MigrationInterface {
  name = 'CreateOrgChatSettingsTable1782422904262';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "org_chat_settings" ("id" character varying NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "orgId" character varying NOT NULL, "internetSearchEnabled" boolean NOT NULL DEFAULT true, CONSTRAINT "PK_33df1884b1237cb3c67eb3e1fd5" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_94c5fe9e0c58dc8d476150a133" ON "org_chat_settings" ("orgId") `,
    );
    await queryRunner.query(
      `ALTER TABLE "org_chat_settings" ADD CONSTRAINT "FK_94c5fe9e0c58dc8d476150a1336" FOREIGN KEY ("orgId") REFERENCES "orgs"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "org_chat_settings" DROP CONSTRAINT "FK_94c5fe9e0c58dc8d476150a1336"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_94c5fe9e0c58dc8d476150a133"`,
    );
    await queryRunner.query(`DROP TABLE "org_chat_settings"`);
  }
}
