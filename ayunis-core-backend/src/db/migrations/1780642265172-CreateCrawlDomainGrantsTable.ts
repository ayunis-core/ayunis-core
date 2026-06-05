import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateCrawlDomainGrantsTable1780642265172 implements MigrationInterface {
    name = 'CreateCrawlDomainGrantsTable1780642265172'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "crawl_domain_grants" ("id" character varying NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "domain" character varying NOT NULL, "orgId" character varying NOT NULL, CONSTRAINT "UQ_db3eb87481937f459c372128278" UNIQUE ("domain"), CONSTRAINT "PK_742af002e017f2e98ae7eeeff77" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_0703c6d88796fa39ae43e325fc" ON "crawl_domain_grants" ("orgId") `);
        await queryRunner.query(`ALTER TABLE "crawl_domain_grants" ADD CONSTRAINT "FK_0703c6d88796fa39ae43e325fc2" FOREIGN KEY ("orgId") REFERENCES "orgs"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "crawl_domain_grants" DROP CONSTRAINT "FK_0703c6d88796fa39ae43e325fc2"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_0703c6d88796fa39ae43e325fc"`);
        await queryRunner.query(`DROP TABLE "crawl_domain_grants"`);
    }

}
