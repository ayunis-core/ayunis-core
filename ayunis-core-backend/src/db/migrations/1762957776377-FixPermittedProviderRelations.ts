import { MigrationInterface, QueryRunner } from 'typeorm';

export class FixPermittedProviderRelations1762957776377
  implements MigrationInterface
{
  name = 'FixPermittedProviderRelations1762957776377';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Step 1: Add id column as nullable uuid first
    await queryRunner.query(`ALTER TABLE "permitted_providers" ADD "id" uuid`);

    // Step 2: Generate UUIDs for existing rows
    await queryRunner.query(
      `UPDATE "permitted_providers" SET "id" = gen_random_uuid() WHERE "id" IS NULL`,
    );

    // Step 3: Make id NOT NULL
    await queryRunner.query(
      `ALTER TABLE "permitted_providers" ALTER COLUMN "id" SET NOT NULL`,
    );

    // Step 4: Drop old primary key constraint
    await queryRunner.query(
      `ALTER TABLE "permitted_providers" DROP CONSTRAINT "PK_1da22e3e2c4bbfbd9f805bc4377"`,
    );

    // Step 5: Add temporary composite primary key
    await queryRunner.query(
      `ALTER TABLE "permitted_providers" ADD CONSTRAINT "PK_2668f99a9fe74501e6e487484e8" PRIMARY KEY ("provider", "id")`,
    );

    // Step 6: Add timestamp columns
    await queryRunner.query(
      `ALTER TABLE "permitted_providers" ADD "createdAt" TIMESTAMP NOT NULL DEFAULT now()`,
    );
    await queryRunner.query(
      `ALTER TABLE "permitted_providers" ADD "updatedAt" TIMESTAMP NOT NULL DEFAULT now()`,
    );

    // Step 7: Drop composite primary key
    await queryRunner.query(
      `ALTER TABLE "permitted_providers" DROP CONSTRAINT "PK_2668f99a9fe74501e6e487484e8"`,
    );

    // Step 8: Set new primary key to id only
    await queryRunner.query(
      `ALTER TABLE "permitted_providers" ADD CONSTRAINT "PK_02892ef3b02fe97045c181effb6" PRIMARY KEY ("id")`,
    );

    // Step 9: Create unique composite index
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_b0f8b9846a6b4679c2fcdafc09" ON "permitted_providers" ("orgId", "provider") `,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Step 1: Drop unique index
    await queryRunner.query(
      `DROP INDEX "public"."IDX_b0f8b9846a6b4679c2fcdafc09"`,
    );

    // Step 2: Drop current primary key (id only)
    await queryRunner.query(
      `ALTER TABLE "permitted_providers" DROP CONSTRAINT "PK_02892ef3b02fe97045c181effb6"`,
    );

    // Step 3: Re-add composite primary key
    await queryRunner.query(
      `ALTER TABLE "permitted_providers" ADD CONSTRAINT "PK_2668f99a9fe74501e6e487484e8" PRIMARY KEY ("provider", "id")`,
    );

    // Step 4: Drop timestamp columns
    await queryRunner.query(
      `ALTER TABLE "permitted_providers" DROP COLUMN "updatedAt"`,
    );
    await queryRunner.query(
      `ALTER TABLE "permitted_providers" DROP COLUMN "createdAt"`,
    );

    // Step 5: Drop composite primary key
    await queryRunner.query(
      `ALTER TABLE "permitted_providers" DROP CONSTRAINT "PK_2668f99a9fe74501e6e487484e8"`,
    );

    // Step 6: Restore original primary key (provider only)
    await queryRunner.query(
      `ALTER TABLE "permitted_providers" ADD CONSTRAINT "PK_1da22e3e2c4bbfbd9f805bc4377" PRIMARY KEY ("provider")`,
    );

    // Step 7: Drop id column
    await queryRunner.query(
      `ALTER TABLE "permitted_providers" DROP COLUMN "id"`,
    );
  }
}
