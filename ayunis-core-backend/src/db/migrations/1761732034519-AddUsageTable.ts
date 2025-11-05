import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUsageTable1761732034519 implements MigrationInterface {
  name = 'AddUsageTable1761732034519';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Ensure uuid-ossp extension is available for uuid_generate_v4() function
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);

    await queryRunner.query(`
      CREATE TABLE "usage" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        "userId" uuid NOT NULL,
        "organizationId" uuid NOT NULL,
        "modelId" uuid NOT NULL,
        "provider" character varying(50) NOT NULL,
        "inputTokens" integer NOT NULL,
        "outputTokens" integer NOT NULL,
        "totalTokens" integer NOT NULL,
        "cost" numeric(10,6),
        "currency" character varying(3),
        "requestId" uuid NOT NULL,
        CONSTRAINT "PK_usage_id" PRIMARY KEY ("id")
      )
    `);

    // Create indexes for better query performance
    await queryRunner.query(`
      CREATE INDEX "IDX_usage_organizationId_createdAt" 
      ON "usage" ("organizationId", "createdAt")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_usage_userId_createdAt" 
      ON "usage" ("userId", "createdAt")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_usage_modelId_createdAt" 
      ON "usage" ("modelId", "createdAt")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_usage_provider_createdAt" 
      ON "usage" ("provider", "createdAt")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_usage_organizationId_provider_createdAt" 
      ON "usage" ("organizationId", "provider", "createdAt")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "IDX_usage_organizationId_provider_createdAt"`,
    );
    await queryRunner.query(`DROP INDEX "IDX_usage_provider_createdAt"`);
    await queryRunner.query(`DROP INDEX "IDX_usage_modelId_createdAt"`);
    await queryRunner.query(`DROP INDEX "IDX_usage_userId_createdAt"`);
    await queryRunner.query(`DROP INDEX "IDX_usage_organizationId_createdAt"`);
    await queryRunner.query(`DROP TABLE "usage"`);
  }
}
