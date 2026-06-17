import type { MigrationInterface, QueryRunner } from 'typeorm';

export class DropPromptsTable1776432737603 implements MigrationInterface {
  name = 'DropPromptsTable1776432737603';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "public"."IDX_fd2aed4018953e15ce70f65b42"`,
    );
    await queryRunner.query(`DROP TABLE "prompts"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "prompts" ("id" character varying NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "title" character varying NOT NULL, "content" text NOT NULL, "userId" character varying NOT NULL, CONSTRAINT "PK_21f33798862975179e40b216a1d" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_fd2aed4018953e15ce70f65b42" ON "prompts" ("userId") `,
    );
  }
}
