import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateWorkspacesTable1786446567200 implements MigrationInterface {
  name = 'CreateWorkspacesTable1786446567200';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "workspaces" ("id" character varying NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "name" character varying(255) NOT NULL, "description" character varying(1000), "icon" character varying(64) NOT NULL, "color" character varying(32) NOT NULL, "isPinned" boolean NOT NULL DEFAULT false, "sortOrder" integer NOT NULL DEFAULT '0', "userId" character varying NOT NULL, "orgId" character varying NOT NULL, CONSTRAINT "PK_098656ae401f3e1a4586f47fd8e" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_dc53b3d0b16419a8f5f1745840" ON "workspaces" ("userId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_5e468208a8112a1dc246758a52" ON "workspaces" ("orgId") `,
    );
    await queryRunner.query(
      `ALTER TABLE "workspaces" ADD CONSTRAINT "FK_dc53b3d0b16419a8f5f17458403" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "workspaces" ADD CONSTRAINT "FK_5e468208a8112a1dc246758a527" FOREIGN KEY ("orgId") REFERENCES "orgs"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "workspaces" DROP CONSTRAINT "FK_5e468208a8112a1dc246758a527"`,
    );
    await queryRunner.query(
      `ALTER TABLE "workspaces" DROP CONSTRAINT "FK_dc53b3d0b16419a8f5f17458403"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_5e468208a8112a1dc246758a52"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_dc53b3d0b16419a8f5f1745840"`,
    );
    await queryRunner.query(`DROP TABLE "workspaces"`);
  }
}
