import { MigrationInterface, QueryRunner } from "typeorm";

export class AddSubscriptions1751620580569 implements MigrationInterface {
    name = 'AddSubscriptions1751620580569'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."subscriptions_renewalcycle_enum" AS ENUM('monthly', 'yearly')`);
        await queryRunner.query(`CREATE TABLE "subscriptions" ("id" character varying NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "cancelledAt" TIMESTAMP, "orgId" character varying NOT NULL, "noOfSeats" integer NOT NULL, "pricePerSeat" numeric(10,2) NOT NULL, "renewalCycle" "public"."subscriptions_renewalcycle_enum" NOT NULL, "renewalCycleAnchor" TIMESTAMP NOT NULL, CONSTRAINT "REL_16519322477ef8b09d68ce0488" UNIQUE ("orgId"), CONSTRAINT "PK_a87248d73155605cf782be9ee5e" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_16519322477ef8b09d68ce0488" ON "subscriptions" ("orgId") `);
        await queryRunner.query(`ALTER TYPE "public"."agent_tools_tooltype_enum" RENAME TO "agent_tools_tooltype_enum_old"`);
        await queryRunner.query(`CREATE TYPE "public"."agent_tools_tooltype_enum" AS ENUM('http', 'source_query', 'internet_search', 'website_content', 'custom')`);
        await queryRunner.query(`ALTER TABLE "agent_tools" ALTER COLUMN "toolType" TYPE "public"."agent_tools_tooltype_enum" USING "toolType"::"text"::"public"."agent_tools_tooltype_enum"`);
        await queryRunner.query(`DROP TYPE "public"."agent_tools_tooltype_enum_old"`);
        await queryRunner.query(`ALTER TABLE "subscriptions" ADD CONSTRAINT "FK_16519322477ef8b09d68ce04889" FOREIGN KEY ("orgId") REFERENCES "orgs"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "subscriptions" DROP CONSTRAINT "FK_16519322477ef8b09d68ce04889"`);
        await queryRunner.query(`CREATE TYPE "public"."agent_tools_tooltype_enum_old" AS ENUM('http', 'source_query', 'internet_search', 'website_content')`);
        await queryRunner.query(`ALTER TABLE "agent_tools" ALTER COLUMN "toolType" TYPE "public"."agent_tools_tooltype_enum_old" USING "toolType"::"text"::"public"."agent_tools_tooltype_enum_old"`);
        await queryRunner.query(`DROP TYPE "public"."agent_tools_tooltype_enum"`);
        await queryRunner.query(`ALTER TYPE "public"."agent_tools_tooltype_enum_old" RENAME TO "agent_tools_tooltype_enum"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_16519322477ef8b09d68ce0488"`);
        await queryRunner.query(`DROP TABLE "subscriptions"`);
        await queryRunner.query(`DROP TYPE "public"."subscriptions_renewalcycle_enum"`);
    }

}
