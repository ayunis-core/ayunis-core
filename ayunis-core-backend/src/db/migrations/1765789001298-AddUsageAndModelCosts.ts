import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUsageAndModelCosts1765789001298 implements MigrationInterface {
  name = 'AddUsageAndModelCosts1765789001298';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."usage_provider_enum" AS ENUM('openai', 'anthropic', 'mistral', 'ollama', 'synaforce', 'ayunis', 'otc')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."usage_currency_enum" AS ENUM('EUR', 'USD')`,
    );
    await queryRunner.query(
      `CREATE TABLE "usage" ("id" character varying NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "userId" character varying NOT NULL, "organizationId" character varying NOT NULL, "modelId" character varying NOT NULL, "provider" "public"."usage_provider_enum" NOT NULL, "inputTokens" integer NOT NULL, "outputTokens" integer NOT NULL, "totalTokens" integer NOT NULL, "cost" numeric(10,6), "currency" "public"."usage_currency_enum", "requestId" uuid NOT NULL, CONSTRAINT "PK_7bc33e71ab6c3b71eac72950b44" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_a84595aeab2b176022e1ef6b0c" ON "usage" ("organizationId", "provider", "createdAt") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_4eca2a1e72564bfdec6c88dcf3" ON "usage" ("provider", "createdAt") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_793a834c9698af5a7b022d7399" ON "usage" ("modelId", "createdAt") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_3b5f7176c00a59a347ac3d0eb5" ON "usage" ("userId", "createdAt") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_e9cd121eac67f58b9b51f8eefe" ON "usage" ("organizationId", "createdAt") `,
    );
    await queryRunner.query(
      `ALTER TABLE "models" ADD "inputTokenCost" numeric(10,6)`,
    );
    await queryRunner.query(
      `ALTER TABLE "models" ADD "outputTokenCost" numeric(10,6)`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."models_currency_enum" AS ENUM('EUR', 'USD')`,
    );
    await queryRunner.query(
      `ALTER TABLE "models" ADD "currency" "public"."models_currency_enum"`,
    );
    await queryRunner.query(
      `ALTER TABLE "usage" ADD CONSTRAINT "FK_91e198d9fab36eceba00b08f2b6" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "usage" ADD CONSTRAINT "FK_63052e9cb202de56fd37e3ab5f4" FOREIGN KEY ("organizationId") REFERENCES "orgs"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "usage" ADD CONSTRAINT "FK_523206731b52aa6170a99d10bbf" FOREIGN KEY ("modelId") REFERENCES "models"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "usage" DROP CONSTRAINT "FK_523206731b52aa6170a99d10bbf"`,
    );
    await queryRunner.query(
      `ALTER TABLE "usage" DROP CONSTRAINT "FK_63052e9cb202de56fd37e3ab5f4"`,
    );
    await queryRunner.query(
      `ALTER TABLE "usage" DROP CONSTRAINT "FK_91e198d9fab36eceba00b08f2b6"`,
    );
    await queryRunner.query(`ALTER TABLE "models" DROP COLUMN "currency"`);
    await queryRunner.query(`DROP TYPE "public"."models_currency_enum"`);
    await queryRunner.query(
      `ALTER TABLE "models" DROP COLUMN "outputTokenCost"`,
    );
    await queryRunner.query(
      `ALTER TABLE "models" DROP COLUMN "inputTokenCost"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_e9cd121eac67f58b9b51f8eefe"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_3b5f7176c00a59a347ac3d0eb5"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_793a834c9698af5a7b022d7399"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_4eca2a1e72564bfdec6c88dcf3"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_a84595aeab2b176022e1ef6b0c"`,
    );
    await queryRunner.query(`DROP TABLE "usage"`);
    await queryRunner.query(`DROP TYPE "public"."usage_currency_enum"`);
    await queryRunner.query(`DROP TYPE "public"."usage_provider_enum"`);
  }
}
