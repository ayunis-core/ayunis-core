import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddArtifactTypeDiscriminator1776519724721 implements MigrationInterface {
  name = 'AddArtifactTypeDiscriminator1776519724721';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "artifacts" ADD "type" character varying NOT NULL DEFAULT 'document'`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_37e60dbaec20da2fe8dd446396" ON "artifacts" ("type") `,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "public"."IDX_37e60dbaec20da2fe8dd446396"`,
    );
    await queryRunner.query(`ALTER TABLE "artifacts" DROP COLUMN "type"`);
  }
}
