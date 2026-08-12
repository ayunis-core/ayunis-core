import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateFavorites1786528759738 implements MigrationInterface {
  name = 'CreateFavorites1786528759738';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."favorites_referencetype_enum" AS ENUM('workspace', 'thread')`,
    );
    await queryRunner.query(
      `CREATE TABLE "favorites" ("id" character varying NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "userId" character varying NOT NULL, "referenceType" "public"."favorites_referencetype_enum" NOT NULL, "referenceId" character varying NOT NULL, "position" integer NOT NULL, CONSTRAINT "UQ_b527413b952a9febee24eb49e9f" UNIQUE ("userId", "position"), CONSTRAINT "UQ_205f0e1f423660b759b3f7dc8e5" UNIQUE ("userId", "referenceType", "referenceId"), CONSTRAINT "CHK_68a1c85789c6e1d0bd42e790f4" CHECK ("position" >= 0), CONSTRAINT "PK_890818d27523748dd36a4d1bdc8" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_e747534006c6e3c2f09939da60" ON "favorites" ("userId") `,
    );
    await queryRunner.query(
      `ALTER TABLE "favorites" ADD CONSTRAINT "FK_e747534006c6e3c2f09939da60f" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "favorites" DROP CONSTRAINT "FK_e747534006c6e3c2f09939da60f"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_e747534006c6e3c2f09939da60"`,
    );
    await queryRunner.query(`DROP TABLE "favorites"`);
    await queryRunner.query(
      `DROP TYPE "public"."favorites_referencetype_enum"`,
    );
  }
}
