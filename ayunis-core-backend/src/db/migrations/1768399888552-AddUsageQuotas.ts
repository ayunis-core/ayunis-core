import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUsageQuotas1768399888552 implements MigrationInterface {
  name = 'AddUsageQuotas1768399888552';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."usage_quotas_quotatype_enum" AS ENUM('FAIR_USE_MESSAGES')`,
    );
    await queryRunner.query(
      `CREATE TABLE "usage_quotas" ("id" character varying NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "userId" character varying NOT NULL, "quotaType" "public"."usage_quotas_quotatype_enum" NOT NULL, "count" integer NOT NULL DEFAULT '0', "windowStartAt" TIMESTAMP NOT NULL, "windowDurationMs" bigint NOT NULL, CONSTRAINT "UQ_394fe814ce4a600f6a083111998" UNIQUE ("userId", "quotaType"), CONSTRAINT "PK_6f12bb43b7afd110c544d3549c4" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_394fe814ce4a600f6a08311199" ON "usage_quotas" ("userId", "quotaType") `,
    );
    await queryRunner.query(
      `ALTER TABLE "usage_quotas" ADD CONSTRAINT "FK_37d7c2fab0e43097c7035472533" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "usage_quotas" DROP CONSTRAINT "FK_37d7c2fab0e43097c7035472533"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_394fe814ce4a600f6a08311199"`,
    );
    await queryRunner.query(`DROP TABLE "usage_quotas"`);
    await queryRunner.query(`DROP TYPE "public"."usage_quotas_quotatype_enum"`);
  }
}
