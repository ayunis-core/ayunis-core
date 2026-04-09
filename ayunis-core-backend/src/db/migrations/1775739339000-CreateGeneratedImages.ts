import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateGeneratedImages1775739339000 implements MigrationInterface {
  name = 'CreateGeneratedImages1775739339000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "generated_images" ("id" character varying NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "orgId" character varying NOT NULL, "userId" character varying NOT NULL, "threadId" character varying NOT NULL, "contentType" character varying NOT NULL, "storageKey" text NOT NULL, CONSTRAINT "PK_15d55f9d77eb1ba3ef81b4aa45f" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_a032442a5e7f2db39c86dd1313" ON "generated_images" ("threadId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_d8f739f6fc39b95032b53d1af1" ON "generated_images" ("orgId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_1d4c31fcb4d66565f2f24f7878" ON "generated_images" ("userId") `,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_9464e36eb45be2da9949120f74" ON "generated_images" ("storageKey") `,
    );
    await queryRunner.query(
      `ALTER TABLE "generated_images" ADD CONSTRAINT "FK_a032442a5e7f2db39c86dd13136" FOREIGN KEY ("threadId") REFERENCES "threads"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "generated_images" DROP CONSTRAINT "FK_a032442a5e7f2db39c86dd13136"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_9464e36eb45be2da9949120f74"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_d8f739f6fc39b95032b53d1af1"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_1d4c31fcb4d66565f2f24f7878"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_a032442a5e7f2db39c86dd1313"`,
    );
    await queryRunner.query(`DROP TABLE "generated_images"`);
  }
}
