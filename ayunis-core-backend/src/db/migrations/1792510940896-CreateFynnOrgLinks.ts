import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateFynnOrgLinks1792510940896 implements MigrationInterface {
  name = 'CreateFynnOrgLinks1792510940896';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "fynn_org_links" ("orgId" character varying NOT NULL, "customerId" character varying NOT NULL, CONSTRAINT "PK_beb067a1f691f7e045c9c8e1953" PRIMARY KEY ("orgId"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_c1ec7098c1bd118b15920cb357" ON "fynn_org_links" ("customerId") `,
    );
    await queryRunner.query(
      `ALTER TABLE "fynn_org_links" ADD CONSTRAINT "FK_beb067a1f691f7e045c9c8e1953" FOREIGN KEY ("orgId") REFERENCES "orgs"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "fynn_org_links" DROP CONSTRAINT "FK_beb067a1f691f7e045c9c8e1953"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_c1ec7098c1bd118b15920cb357"`,
    );
    await queryRunner.query(`DROP TABLE "fynn_org_links"`);
  }
}
