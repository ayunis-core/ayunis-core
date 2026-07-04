import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateMfaTables1783154787547 implements MigrationInterface {
    name = 'CreateMfaTables1783154787547'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "user_totps" ("id" character varying NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "userId" character varying NOT NULL, "encryptedSecret" text NOT NULL, "confirmedAt" TIMESTAMP WITH TIME ZONE, "failedAttempts" integer NOT NULL DEFAULT '0', "lockedUntil" TIMESTAMP WITH TIME ZONE, "lastUsedCounter" integer, CONSTRAINT "UQ_7bd8b674fdd1d213dd37315d3ed" UNIQUE ("userId"), CONSTRAINT "REL_7bd8b674fdd1d213dd37315d3e" UNIQUE ("userId"), CONSTRAINT "PK_7eb7f99a78fba7ed2094702a6e5" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_7bd8b674fdd1d213dd37315d3e" ON "user_totps" ("userId") `);
        await queryRunner.query(`CREATE TABLE "org_mfa_requirements" ("id" character varying NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "orgId" character varying NOT NULL, "required" boolean NOT NULL DEFAULT false, CONSTRAINT "UQ_b4e23d13eca54acfac69e1d1cc4" UNIQUE ("orgId"), CONSTRAINT "PK_bd7616cac9385812208559f6892" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_b4e23d13eca54acfac69e1d1cc" ON "org_mfa_requirements" ("orgId") `);
        await queryRunner.query(`CREATE TABLE "mfa_recovery_codes" ("id" character varying NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "userId" character varying NOT NULL, "codeHash" character varying NOT NULL, "usedAt" TIMESTAMP WITH TIME ZONE, CONSTRAINT "PK_0076416b1b84361afc3371ba121" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_1aeec4efb39bc7c382cbce9994" ON "mfa_recovery_codes" ("userId") `);
        await queryRunner.query(`ALTER TABLE "user_totps" ADD CONSTRAINT "FK_7bd8b674fdd1d213dd37315d3ed" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "org_mfa_requirements" ADD CONSTRAINT "FK_b4e23d13eca54acfac69e1d1cc4" FOREIGN KEY ("orgId") REFERENCES "orgs"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "mfa_recovery_codes" ADD CONSTRAINT "FK_1aeec4efb39bc7c382cbce99948" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "mfa_recovery_codes" DROP CONSTRAINT "FK_1aeec4efb39bc7c382cbce99948"`);
        await queryRunner.query(`ALTER TABLE "org_mfa_requirements" DROP CONSTRAINT "FK_b4e23d13eca54acfac69e1d1cc4"`);
        await queryRunner.query(`ALTER TABLE "user_totps" DROP CONSTRAINT "FK_7bd8b674fdd1d213dd37315d3ed"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_1aeec4efb39bc7c382cbce9994"`);
        await queryRunner.query(`DROP TABLE "mfa_recovery_codes"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_b4e23d13eca54acfac69e1d1cc"`);
        await queryRunner.query(`DROP TABLE "org_mfa_requirements"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_7bd8b674fdd1d213dd37315d3e"`);
        await queryRunner.query(`DROP TABLE "user_totps"`);
    }

}
