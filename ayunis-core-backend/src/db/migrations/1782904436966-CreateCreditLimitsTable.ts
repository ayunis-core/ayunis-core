import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateCreditLimitsTable1782904436966 implements MigrationInterface {
  name = 'CreateCreditLimitsTable1782904436966';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "credit_limits" ("id" character varying NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "orgId" character varying NOT NULL, "monthlyCredits" numeric(16,2) NOT NULL, "userId" character varying, "teamId" character varying, "scope" character varying NOT NULL, CONSTRAINT "PK_a107c5b94453801aed5f2074e2d" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_7325622fa9939629cd84e395a3" ON "credit_limits" ("orgId", "userId") WHERE "userId" IS NOT NULL`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_560cbe8e84816e26681dba51e1" ON "credit_limits" ("orgId", "teamId") WHERE "teamId" IS NOT NULL`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_4f4ad00840d79c979a1bee894a" ON "credit_limits" ("scope") `,
    );
    await queryRunner.query(
      `ALTER TABLE "credit_limits" ADD CONSTRAINT "FK_2b29e53b0704ac912eba6a15b7c" FOREIGN KEY ("orgId") REFERENCES "orgs"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "credit_limits" ADD CONSTRAINT "FK_14b2e856ea882295fe6fd1933dc" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "credit_limits" ADD CONSTRAINT "FK_f5d2b85525b8b027fb4008cb83e" FOREIGN KEY ("teamId") REFERENCES "teams"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "credit_limits" DROP CONSTRAINT "FK_f5d2b85525b8b027fb4008cb83e"`,
    );
    await queryRunner.query(
      `ALTER TABLE "credit_limits" DROP CONSTRAINT "FK_14b2e856ea882295fe6fd1933dc"`,
    );
    await queryRunner.query(
      `ALTER TABLE "credit_limits" DROP CONSTRAINT "FK_2b29e53b0704ac912eba6a15b7c"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_4f4ad00840d79c979a1bee894a"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_560cbe8e84816e26681dba51e1"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_7325622fa9939629cd84e395a3"`,
    );
    await queryRunner.query(`DROP TABLE "credit_limits"`);
  }
}
