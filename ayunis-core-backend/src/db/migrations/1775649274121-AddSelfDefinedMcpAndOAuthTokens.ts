import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSelfDefinedMcpAndOAuthTokens1775649274121 implements MigrationInterface {
  name = 'AddSelfDefinedMcpAndOAuthTokens1775649274121';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "mcp_integrations" ADD "oauth_client_id" character varying(255)`,
    );
    await queryRunner.query(
      `ALTER TABLE "mcp_integrations" ADD "oauth_client_secret_encrypted" text`,
    );
    await queryRunner.query(
      `CREATE TABLE "mcp_integration_oauth_tokens" (
        "id" character varying NOT NULL,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        "integration_id" character varying NOT NULL,
        "user_id" character varying,
        "access_token_encrypted" text NOT NULL,
        "refresh_token_encrypted" text,
        "token_expires_at" TIMESTAMP,
        "scope" text,
        CONSTRAINT "PK_6cb5e52dee49b8e98018fdfd045" PRIMARY KEY ("id")
      )`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_mcp_oauth_token_integration" ON "mcp_integration_oauth_tokens" ("integration_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_mcp_oauth_token_user" ON "mcp_integration_oauth_tokens" ("user_id")`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "uq_mcp_oauth_token_user" ON "mcp_integration_oauth_tokens" ("integration_id", "user_id") WHERE "user_id" IS NOT NULL`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "uq_mcp_oauth_token_org" ON "mcp_integration_oauth_tokens" ("integration_id") WHERE "user_id" IS NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "mcp_integration_oauth_tokens" ADD CONSTRAINT "FK_mcp_oauth_token_integration" FOREIGN KEY ("integration_id") REFERENCES "mcp_integrations"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "mcp_integration_oauth_tokens" ADD CONSTRAINT "FK_mcp_oauth_token_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "mcp_integration_oauth_tokens" DROP CONSTRAINT "FK_mcp_oauth_token_user"`,
    );
    await queryRunner.query(
      `ALTER TABLE "mcp_integration_oauth_tokens" DROP CONSTRAINT "FK_mcp_oauth_token_integration"`,
    );
    await queryRunner.query(`DROP INDEX "public"."uq_mcp_oauth_token_org"`);
    await queryRunner.query(`DROP INDEX "public"."uq_mcp_oauth_token_user"`);
    await queryRunner.query(`DROP INDEX "public"."idx_mcp_oauth_token_user"`);
    await queryRunner.query(
      `DROP INDEX "public"."idx_mcp_oauth_token_integration"`,
    );
    await queryRunner.query(`DROP TABLE "mcp_integration_oauth_tokens"`);
    await queryRunner.query(
      `ALTER TABLE "mcp_integrations" DROP COLUMN "oauth_client_secret_encrypted"`,
    );
    await queryRunner.query(
      `ALTER TABLE "mcp_integrations" DROP COLUMN "oauth_client_id"`,
    );
  }
}
