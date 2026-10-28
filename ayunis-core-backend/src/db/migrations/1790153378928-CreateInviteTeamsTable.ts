import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateInviteTeamsTable1790153378928 implements MigrationInterface {
  name = 'CreateInviteTeamsTable1790153378928';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "invite_teams" ("id" character varying NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "invite_id" character varying NOT NULL, "team_id" character varying NOT NULL, CONSTRAINT "UQ_ac444e016d69560bfdaa11e6b32" UNIQUE ("invite_id", "team_id"), CONSTRAINT "PK_150fb0cc6eab602d1d348be8f05" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_c4f9443c96ee275508a40c4fd1" ON "invite_teams" ("team_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_b60e0307f9c3d06cd592f1ad1c" ON "invite_teams" ("invite_id") `,
    );
    await queryRunner.query(
      `ALTER TABLE "invite_teams" ADD CONSTRAINT "FK_b60e0307f9c3d06cd592f1ad1ca" FOREIGN KEY ("invite_id") REFERENCES "invites"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "invite_teams" ADD CONSTRAINT "FK_c4f9443c96ee275508a40c4fd1b" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "invite_teams" DROP CONSTRAINT "FK_c4f9443c96ee275508a40c4fd1b"`,
    );
    await queryRunner.query(
      `ALTER TABLE "invite_teams" DROP CONSTRAINT "FK_b60e0307f9c3d06cd592f1ad1ca"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_b60e0307f9c3d06cd592f1ad1c"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_c4f9443c96ee275508a40c4fd1"`,
    );
    await queryRunner.query(`DROP TABLE "invite_teams"`);
  }
}
