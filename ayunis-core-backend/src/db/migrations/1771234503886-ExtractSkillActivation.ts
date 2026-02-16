import { MigrationInterface, QueryRunner } from 'typeorm';

export class ExtractSkillActivation1771234503886 implements MigrationInterface {
  name = 'ExtractSkillActivation1771234503886';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "skill_activations" ("id" uuid NOT NULL, "skillId" character varying NOT NULL, "userId" character varying NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_skill_activation_skillId_userId" UNIQUE ("skillId", "userId"), CONSTRAINT "PK_0b22559d50b2d24952dc2a8b098" PRIMARY KEY ("id"))`,
    );
    // Migrate existing isActive=true skills into skill_activations
    await queryRunner.query(
      `INSERT INTO "skill_activations" ("id", "skillId", "userId", "createdAt") SELECT gen_random_uuid(), "id", "userId", NOW() FROM "skills" WHERE "isActive" = true`,
    );
    await queryRunner.query(`ALTER TABLE "skills" DROP COLUMN "isActive"`);
    await queryRunner.query(
      `ALTER TABLE "skill_activations" ADD CONSTRAINT "FK_6416c05feb99f4b56b7ce4af155" FOREIGN KEY ("skillId") REFERENCES "skills"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "skill_activations" ADD CONSTRAINT "FK_8caf15dc7766481cd4197e566f8" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "skill_activations" DROP CONSTRAINT "FK_8caf15dc7766481cd4197e566f8"`,
    );
    await queryRunner.query(
      `ALTER TABLE "skill_activations" DROP CONSTRAINT "FK_6416c05feb99f4b56b7ce4af155"`,
    );
    await queryRunner.query(
      `ALTER TABLE "skills" ADD "isActive" boolean NOT NULL DEFAULT false`,
    );
    // Restore activation state from skill_activations back to skills.isActive
    await queryRunner.query(
      `UPDATE "skills" SET "isActive" = true WHERE "id" IN (SELECT "skillId" FROM "skill_activations")`,
    );
    await queryRunner.query(`DROP TABLE "skill_activations"`);
  }
}
