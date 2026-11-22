import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSyncedLocationToSources1795340469485 implements MigrationInterface {
  name = 'AddSyncedLocationToSources1795340469485';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "sources" ADD "syncedLocationId" character varying`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_d7b53e57758d469f76f3796587" ON "sources" ("syncedLocationId") `,
    );
    await queryRunner.query(
      `ALTER TABLE "sources" ADD CONSTRAINT "FK_d7b53e57758d469f76f3796587f" FOREIGN KEY ("syncedLocationId") REFERENCES "knowledge_base_synced_locations"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "sources" DROP CONSTRAINT "FK_d7b53e57758d469f76f3796587f"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_d7b53e57758d469f76f3796587"`,
    );
    await queryRunner.query(
      `ALTER TABLE "sources" DROP COLUMN "syncedLocationId"`,
    );
  }
}
