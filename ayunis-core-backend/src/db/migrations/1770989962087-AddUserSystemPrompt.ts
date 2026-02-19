import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUserSystemPrompt1770989962087 implements MigrationInterface {
  name = 'AddUserSystemPrompt1770989962087';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "user_system_prompts" ("id" character varying NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "userId" character varying NOT NULL, "systemPrompt" text NOT NULL, CONSTRAINT "PK_7221410a1256b68180fe32c75a1" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_67a0210e4823f925cd8372505f" ON "user_system_prompts" ("userId") `,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "public"."IDX_67a0210e4823f925cd8372505f"`,
    );
    await queryRunner.query(`DROP TABLE "user_system_prompts"`);
  }
}
