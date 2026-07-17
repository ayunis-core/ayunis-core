import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CreatePasswordSetTokensTable1784121967775 implements MigrationInterface {
  name = 'CreatePasswordSetTokensTable1784121967775';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "password_set_tokens" ("id" character varying NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "userId" character varying NOT NULL, "tokenHash" character varying NOT NULL, "purpose" character varying NOT NULL, "expiresAt" TIMESTAMP WITH TIME ZONE NOT NULL, "usedAt" TIMESTAMP WITH TIME ZONE, CONSTRAINT "PK_fb05d8ad566f48502e9ad83e2d1" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_261d55050b74d1a95f7760ce67" ON "password_set_tokens" ("userId") `,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_cafead5f16fdd1e2c6cf51287e" ON "password_set_tokens" ("tokenHash") `,
    );
    await queryRunner.query(
      `ALTER TABLE "password_set_tokens" ADD CONSTRAINT "FK_261d55050b74d1a95f7760ce670" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "password_set_tokens" DROP CONSTRAINT "FK_261d55050b74d1a95f7760ce670"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_cafead5f16fdd1e2c6cf51287e"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_261d55050b74d1a95f7760ce67"`,
    );
    await queryRunner.query(`DROP TABLE "password_set_tokens"`);
  }
}
