import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddGeneratedImageAnonymousContext1775739400000 implements MigrationInterface {
  name = 'AddGeneratedImageAnonymousContext1775739400000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "generated_images" ADD "isAnonymous" boolean NOT NULL DEFAULT false`,
    );
    await queryRunner.query(
      `UPDATE "generated_images" "generatedImage"
       SET "isAnonymous" = "thread"."isAnonymous"
       FROM "threads" "thread"
       WHERE "generatedImage"."threadId" = "thread"."id"`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "generated_images" DROP COLUMN "isAnonymous"`,
    );
  }
}
