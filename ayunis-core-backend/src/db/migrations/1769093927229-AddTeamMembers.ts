import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTeamMembers1769093927229 implements MigrationInterface {
  name = 'AddTeamMembers1769093927229';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "team_members" ("id" character varying NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "team_id" character varying NOT NULL, "user_id" character varying NOT NULL, CONSTRAINT "UQ_1d3c06a8217a8785e2af0ec4ab8" UNIQUE ("team_id", "user_id"), CONSTRAINT "PK_ca3eae89dcf20c9fd95bf7460aa" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_c2bf4967c8c2a6b845dadfbf3d" ON "team_members" ("user_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_fdad7d5768277e60c40e01cdce" ON "team_members" ("team_id") `,
    );
    await queryRunner.query(
      `ALTER TABLE "team_members" ADD CONSTRAINT "FK_fdad7d5768277e60c40e01cdcea" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "team_members" ADD CONSTRAINT "FK_c2bf4967c8c2a6b845dadfbf3d4" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "team_members" DROP CONSTRAINT "FK_c2bf4967c8c2a6b845dadfbf3d4"`,
    );
    await queryRunner.query(
      `ALTER TABLE "team_members" DROP CONSTRAINT "FK_fdad7d5768277e60c40e01cdcea"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_fdad7d5768277e60c40e01cdce"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_c2bf4967c8c2a6b845dadfbf3d"`,
    );
    await queryRunner.query(`DROP TABLE "team_members"`);
  }
}
