import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUniqueConstraintArtifactVersionNumber1771494072114
  implements MigrationInterface
{
  name = 'AddUniqueConstraintArtifactVersionNumber1771494072114';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Remove duplicate (artifactId, versionNumber) rows, keeping the earliest created
    await queryRunner.query(`
      DELETE FROM "artifact_versions"
      WHERE "id" IN (
        SELECT "id" FROM (
          SELECT "id",
                 ROW_NUMBER() OVER (
                   PARTITION BY "artifactId", "versionNumber"
                   ORDER BY "createdAt" ASC, "id" ASC
                 ) AS rn
          FROM "artifact_versions"
        ) ranked
        WHERE rn > 1
      )
    `);

    await queryRunner.query(
      `ALTER TABLE "artifact_versions" ADD CONSTRAINT "UQ_artifact_version_number" UNIQUE ("artifactId", "versionNumber")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "artifact_versions" DROP CONSTRAINT "UQ_artifact_version_number"`,
    );
  }
}
