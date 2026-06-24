import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateOrgRetentionPoliciesTable1781642066562 implements MigrationInterface {
  name = 'CreateOrgRetentionPoliciesTable1781642066562';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "org_retention_policies" ("id" character varying NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "orgId" character varying NOT NULL, "retentionDays" integer, CONSTRAINT "UQ_a4d7f545955a16e80c9b97044f6" UNIQUE ("orgId"), CONSTRAINT "PK_13884251d23bfa97980552a0d5b" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_a4d7f545955a16e80c9b97044f" ON "org_retention_policies" ("orgId") `,
    );
    await queryRunner.query(
      `ALTER TABLE "org_retention_policies" ADD CONSTRAINT "FK_a4d7f545955a16e80c9b97044f6" FOREIGN KEY ("orgId") REFERENCES "orgs"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "org_retention_policies" DROP CONSTRAINT "FK_a4d7f545955a16e80c9b97044f6"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_a4d7f545955a16e80c9b97044f"`,
    );
    await queryRunner.query(`DROP TABLE "org_retention_policies"`);
  }
}
