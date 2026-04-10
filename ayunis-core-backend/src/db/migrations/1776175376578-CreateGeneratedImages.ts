import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateGeneratedImages1776175376578 implements MigrationInterface {
  name = 'CreateGeneratedImages1776175376578';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "generated_images" ("id" character varying NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "orgId" character varying NOT NULL, "userId" character varying NOT NULL, "threadId" character varying NOT NULL, "contentType" character varying NOT NULL, "isAnonymous" boolean NOT NULL DEFAULT false, "storageKey" text NOT NULL, CONSTRAINT "PK_1ee659109b9a66d386ba8be0319" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_49410e261d41ec5eafb02a4401" ON "generated_images" ("orgId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_895e52de1edb47b104a25cbb38" ON "generated_images" ("userId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_eb89025b3d27ec15c52096769a" ON "generated_images" ("threadId") `,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_db211d54bc3fb2a317bca870be" ON "generated_images" ("storageKey") `,
    );
    await queryRunner.query(
      `ALTER TABLE "generated_images" ADD CONSTRAINT "FK_895e52de1edb47b104a25cbb389" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "generated_images" ADD CONSTRAINT "FK_eb89025b3d27ec15c52096769ab" FOREIGN KEY ("threadId") REFERENCES "threads"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "generated_images" DROP CONSTRAINT "FK_eb89025b3d27ec15c52096769ab"`,
    );
    await queryRunner.query(
      `ALTER TABLE "generated_images" DROP CONSTRAINT "FK_895e52de1edb47b104a25cbb389"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_db211d54bc3fb2a317bca870be"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_eb89025b3d27ec15c52096769a"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_895e52de1edb47b104a25cbb38"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_49410e261d41ec5eafb02a4401"`,
    );
    await queryRunner.query(`DROP TABLE "generated_images"`);
  }
}
