import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddRoutineToFavoriteReferenceTypes1795691745234 implements MigrationInterface {
  name = 'AddRoutineToFavoriteReferenceTypes1795691745234';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "favorites" DROP CONSTRAINT "UQ_205f0e1f423660b759b3f7dc8e5"`,
    );
    await queryRunner.query(
      `ALTER TYPE "public"."favorites_referencetype_enum" RENAME TO "favorites_referencetype_enum_old"`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."favorites_referencetype_enum" AS ENUM('workspace', 'thread', 'routine')`,
    );
    await queryRunner.query(
      `ALTER TABLE "favorites" ALTER COLUMN "referenceType" TYPE "public"."favorites_referencetype_enum" USING "referenceType"::"text"::"public"."favorites_referencetype_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE "public"."favorites_referencetype_enum_old"`,
    );
    await queryRunner.query(
      `ALTER TABLE "favorites" ADD CONSTRAINT "UQ_205f0e1f423660b759b3f7dc8e5" UNIQUE ("userId", "referenceType", "referenceId")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "favorites" DROP CONSTRAINT "UQ_205f0e1f423660b759b3f7dc8e5"`,
    );
    // The old enum cannot hold routine favorites.
    await queryRunner.query(
      `DELETE FROM "favorites" WHERE "referenceType" = 'routine'`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."favorites_referencetype_enum_old" AS ENUM('thread', 'workspace')`,
    );
    await queryRunner.query(
      `ALTER TABLE "favorites" ALTER COLUMN "referenceType" TYPE "public"."favorites_referencetype_enum_old" USING "referenceType"::"text"::"public"."favorites_referencetype_enum_old"`,
    );
    await queryRunner.query(
      `DROP TYPE "public"."favorites_referencetype_enum"`,
    );
    await queryRunner.query(
      `ALTER TYPE "public"."favorites_referencetype_enum_old" RENAME TO "favorites_referencetype_enum"`,
    );
    await queryRunner.query(
      `ALTER TABLE "favorites" ADD CONSTRAINT "UQ_205f0e1f423660b759b3f7dc8e5" UNIQUE ("userId", "referenceType", "referenceId")`,
    );
  }
}
