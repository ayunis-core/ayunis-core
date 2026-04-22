import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddParentChunksSourceFk1776510781603 implements MigrationInterface {
  name = 'AddParentChunksSourceFk1776510781603';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Log the orphan count so operators see the blast radius in the migration output.
    // Orphans exist only if parent_chunks was populated before this FK was added.
    await queryRunner.query(`DO $$
      DECLARE orphan_count INTEGER;
      BEGIN
        SELECT COUNT(*) INTO orphan_count FROM "parent_chunks"
          WHERE NOT EXISTS (SELECT 1 FROM "sources" "s" WHERE "s"."id" = "parent_chunks"."relatedDocumentId");
        RAISE NOTICE 'AddParentChunksSourceFk: deleting % orphaned parent_chunks (cascades to child_chunks)', orphan_count;
      END $$;`);

    // Delete orphans so the FK constraint can be added cleanly. Cascades to child_chunks.
    await queryRunner.query(
      `DELETE FROM "parent_chunks" WHERE NOT EXISTS (SELECT 1 FROM "sources" "s" WHERE "s"."id" = "parent_chunks"."relatedDocumentId")`,
    );

    await queryRunner.query(
      `ALTER TABLE "parent_chunks" ADD CONSTRAINT "FK_e4a9bc2f434203a5250d1be480b" FOREIGN KEY ("relatedDocumentId") REFERENCES "sources"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "parent_chunks" DROP CONSTRAINT "FK_e4a9bc2f434203a5250d1be480b"`,
    );
  }
}
