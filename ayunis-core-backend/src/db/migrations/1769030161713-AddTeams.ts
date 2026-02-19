import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTeams1769030161713 implements MigrationInterface {
  name = 'AddTeams1769030161713';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "teams" ("id" character varying NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "name" character varying NOT NULL, "org_id" character varying NOT NULL, CONSTRAINT "PK_7e5523774a38b08a6236d322403" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_8811ea6855a4496e61c4fe3951" ON "teams" ("org_id", "name") `,
    );
    await queryRunner.query(
      `ALTER TABLE "teams" ADD CONSTRAINT "FK_b729d9a1986ed0c3ae018e61310" FOREIGN KEY ("org_id") REFERENCES "orgs"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "teams" DROP CONSTRAINT "FK_b729d9a1986ed0c3ae018e61310"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_8811ea6855a4496e61c4fe3951"`,
    );
    await queryRunner.query(`DROP TABLE "teams"`);
  }
}
