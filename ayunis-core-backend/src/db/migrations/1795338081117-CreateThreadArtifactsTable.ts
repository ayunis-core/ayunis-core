import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateThreadArtifactsTable1795338081117 implements MigrationInterface {
  name = 'CreateThreadArtifactsTable1795338081117';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "thread_artifacts" ("threadId" character varying NOT NULL, "artifactId" character varying NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_a86d3382efc43518a14981ffd84" PRIMARY KEY ("threadId", "artifactId"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_74bf37d2997afa81d8498d5cd7" ON "thread_artifacts" ("artifactId") `,
    );
    await queryRunner.query(
      `ALTER TABLE "thread_artifacts" ADD CONSTRAINT "FK_3001b6f1e4b79de767daaac07a9" FOREIGN KEY ("threadId") REFERENCES "threads"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "thread_artifacts" ADD CONSTRAINT "FK_74bf37d2997afa81d8498d5cd77" FOREIGN KEY ("artifactId") REFERENCES "artifacts"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `INSERT INTO "thread_artifacts" ("threadId", "artifactId", "createdAt") SELECT "threadId", "id", "createdAt" FROM "artifacts"`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "thread_artifacts" DROP CONSTRAINT "FK_74bf37d2997afa81d8498d5cd77"`,
    );
    await queryRunner.query(
      `ALTER TABLE "thread_artifacts" DROP CONSTRAINT "FK_3001b6f1e4b79de767daaac07a9"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_74bf37d2997afa81d8498d5cd7"`,
    );
    await queryRunner.query(`DROP TABLE "thread_artifacts"`);
  }
}
