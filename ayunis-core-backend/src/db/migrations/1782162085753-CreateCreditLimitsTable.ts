import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateCreditLimitsTable1782162085753 implements MigrationInterface {
  name = 'CreateCreditLimitsTable1782162085753';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."credit_limits_scope_enum" AS ENUM('USER', 'TEAM')`,
    );
    await queryRunner.query(
      `CREATE TABLE "credit_limits" ("id" character varying NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "org_id" character varying NOT NULL, "scope" "public"."credit_limits_scope_enum" NOT NULL, "target_user_id" character varying, "target_team_id" character varying, "monthly_credits" numeric(16,2) NOT NULL, CONSTRAINT "CHK_credit_limit_target_xor" CHECK (("target_user_id" IS NULL) <> ("target_team_id" IS NULL)), CONSTRAINT "PK_a107c5b94453801aed5f2074e2d" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_credit_limit_team" ON "credit_limits" ("org_id", "target_team_id") WHERE "target_team_id" IS NOT NULL`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_credit_limit_user" ON "credit_limits" ("org_id", "target_user_id") WHERE "target_user_id" IS NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "credit_limits" ADD CONSTRAINT "FK_eb158e8d7787af7ed9c95eec4b4" FOREIGN KEY ("org_id") REFERENCES "orgs"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "credit_limits" ADD CONSTRAINT "FK_50d612ca1c2cba71aecde193c10" FOREIGN KEY ("target_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "credit_limits" ADD CONSTRAINT "FK_622456929bdc142848e0f2eae50" FOREIGN KEY ("target_team_id") REFERENCES "teams"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "credit_limits" DROP CONSTRAINT "FK_622456929bdc142848e0f2eae50"`,
    );
    await queryRunner.query(
      `ALTER TABLE "credit_limits" DROP CONSTRAINT "FK_50d612ca1c2cba71aecde193c10"`,
    );
    await queryRunner.query(
      `ALTER TABLE "credit_limits" DROP CONSTRAINT "FK_eb158e8d7787af7ed9c95eec4b4"`,
    );
    await queryRunner.query(`DROP INDEX "public"."UQ_credit_limit_user"`);
    await queryRunner.query(`DROP INDEX "public"."UQ_credit_limit_team"`);
    await queryRunner.query(`DROP TABLE "credit_limits"`);
    await queryRunner.query(`DROP TYPE "public"."credit_limits_scope_enum"`);
  }
}
