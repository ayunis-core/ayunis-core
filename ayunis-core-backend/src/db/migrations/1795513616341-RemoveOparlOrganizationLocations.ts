import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Organizations are mirrored without an address (AYC-2066): for a small
 * body such as an Ortsbeirat the RIS gives its chair's home. Existing
 * mirrors lose the address from the original and the locations that only
 * organizations referred to; places of bodies, meetings and papers stay.
 */
export class RemoveOparlOrganizationLocations1795513616341 implements MigrationInterface {
  name = 'RemoveOparlOrganizationLocations1795513616341';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DELETE FROM "oparl_locations" l
       WHERE EXISTS (SELECT 1 FROM "oparl_organizations" o
                     WHERE o."systemId" = l."systemId" AND o."locationOparlId" = l."oparlId")
         AND NOT EXISTS (SELECT 1 FROM "oparl_bodies" b
                         WHERE b."systemId" = l."systemId" AND b."locationOparlId" = l."oparlId")
         AND NOT EXISTS (SELECT 1 FROM "oparl_meetings" m
                         WHERE m."systemId" = l."systemId" AND m."locationOparlId" = l."oparlId")
         AND NOT EXISTS (SELECT 1 FROM "oparl_paper_locations" j
                         JOIN "oparl_papers" p ON p."id" = j."ownerId"
                         WHERE p."systemId" = l."systemId" AND j."targetOparlId" = l."oparlId")`,
    );
    await queryRunner.query(
      `UPDATE "oparl_organizations" SET "raw" = "raw" - 'location' - 'locationObject'
       WHERE "raw" ?| ARRAY['location', 'locationObject']`,
    );
    await queryRunner.query(
      `ALTER TABLE "oparl_organizations" DROP CONSTRAINT "FK_626dbcd112619752ba2b826c850"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_626dbcd112619752ba2b826c85"`,
    );
    await queryRunner.query(
      `ALTER TABLE "oparl_organizations" DROP COLUMN "locationOparlId"`,
    );
    await queryRunner.query(
      `ALTER TABLE "oparl_organizations" DROP COLUMN "locationId"`,
    );
  }

  // The removed addresses are not restored.
  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "oparl_organizations" ADD "locationId" character varying`,
    );
    await queryRunner.query(
      `ALTER TABLE "oparl_organizations" ADD "locationOparlId" text`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_626dbcd112619752ba2b826c85" ON "oparl_organizations" ("locationId") `,
    );
    await queryRunner.query(
      `ALTER TABLE "oparl_organizations" ADD CONSTRAINT "FK_626dbcd112619752ba2b826c850" FOREIGN KEY ("locationId") REFERENCES "oparl_locations"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
  }
}
