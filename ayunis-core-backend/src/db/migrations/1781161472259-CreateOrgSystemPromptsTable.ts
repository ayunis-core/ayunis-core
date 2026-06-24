import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateOrgSystemPromptsTable1781161472259 implements MigrationInterface {
  name = 'CreateOrgSystemPromptsTable1781161472259';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "org_system_prompts" ("id" character varying NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "orgId" character varying NOT NULL, "systemPrompt" text NOT NULL, CONSTRAINT "PK_01f2eebbbc16903068294a27a24" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_218d23ec3c056fa568b5c8beb4" ON "org_system_prompts" ("orgId") `,
    );
    await queryRunner.query(
      `ALTER TABLE "org_system_prompts" ADD CONSTRAINT "FK_218d23ec3c056fa568b5c8beb4a" FOREIGN KEY ("orgId") REFERENCES "orgs"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "org_system_prompts" DROP CONSTRAINT "FK_218d23ec3c056fa568b5c8beb4a"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_218d23ec3c056fa568b5c8beb4"`,
    );
    await queryRunner.query(`DROP TABLE "org_system_prompts"`);
  }
}
