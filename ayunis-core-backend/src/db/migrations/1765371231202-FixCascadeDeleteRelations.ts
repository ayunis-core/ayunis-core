import type { MigrationInterface, QueryRunner } from 'typeorm';

export class FixCascadeDeleteRelations1765371231202
  implements MigrationInterface
{
  name = 'FixCascadeDeleteRelations1765371231202';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" DROP CONSTRAINT "FK_1890588e47e133fd85670f187d6"`,
    );
    await queryRunner.query(
      `ALTER TABLE "tool_config_record" DROP CONSTRAINT "FK_6d332070521471c40d83557db85"`,
    );
    await queryRunner.query(
      `ALTER TABLE "agents" DROP CONSTRAINT "FK_ef998451a458221d3c409b37923"`,
    );
    await queryRunner.query(
      `ALTER TABLE "trials" DROP CONSTRAINT "FK_21266e62a69dbcfa54790ce00e7"`,
    );
    await queryRunner.query(
      `ALTER TABLE "subscriptions" DROP CONSTRAINT "FK_16519322477ef8b09d68ce04889"`,
    );
    await queryRunner.query(
      `ALTER TABLE "threads" DROP CONSTRAINT "FK_16a4760316ad946a5b114b27d12"`,
    );
    await queryRunner.query(
      `ALTER TABLE "threads" DROP CONSTRAINT "FK_d6f207f7897d73a658b3b7147eb"`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ADD CONSTRAINT "FK_1890588e47e133fd85670f187d6" FOREIGN KEY ("orgId") REFERENCES "orgs"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "tool_config_record" ADD CONSTRAINT "FK_6d332070521471c40d83557db85" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "agents" ADD CONSTRAINT "FK_ef998451a458221d3c409b37923" FOREIGN KEY ("modelId") REFERENCES "permitted_models"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "trials" ADD CONSTRAINT "FK_21266e62a69dbcfa54790ce00e7" FOREIGN KEY ("orgId") REFERENCES "orgs"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "subscriptions" ADD CONSTRAINT "FK_16519322477ef8b09d68ce04889" FOREIGN KEY ("orgId") REFERENCES "orgs"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "threads" ADD CONSTRAINT "FK_16a4760316ad946a5b114b27d12" FOREIGN KEY ("modelId") REFERENCES "permitted_models"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "threads" ADD CONSTRAINT "FK_d6f207f7897d73a658b3b7147eb" FOREIGN KEY ("agentId") REFERENCES "agents"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "threads" DROP CONSTRAINT "FK_d6f207f7897d73a658b3b7147eb"`,
    );
    await queryRunner.query(
      `ALTER TABLE "threads" DROP CONSTRAINT "FK_16a4760316ad946a5b114b27d12"`,
    );
    await queryRunner.query(
      `ALTER TABLE "subscriptions" DROP CONSTRAINT "FK_16519322477ef8b09d68ce04889"`,
    );
    await queryRunner.query(
      `ALTER TABLE "trials" DROP CONSTRAINT "FK_21266e62a69dbcfa54790ce00e7"`,
    );
    await queryRunner.query(
      `ALTER TABLE "agents" DROP CONSTRAINT "FK_ef998451a458221d3c409b37923"`,
    );
    await queryRunner.query(
      `ALTER TABLE "tool_config_record" DROP CONSTRAINT "FK_6d332070521471c40d83557db85"`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" DROP CONSTRAINT "FK_1890588e47e133fd85670f187d6"`,
    );
    await queryRunner.query(
      `ALTER TABLE "threads" ADD CONSTRAINT "FK_d6f207f7897d73a658b3b7147eb" FOREIGN KEY ("agentId") REFERENCES "agents"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "threads" ADD CONSTRAINT "FK_16a4760316ad946a5b114b27d12" FOREIGN KEY ("modelId") REFERENCES "permitted_models"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "subscriptions" ADD CONSTRAINT "FK_16519322477ef8b09d68ce04889" FOREIGN KEY ("orgId") REFERENCES "orgs"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "trials" ADD CONSTRAINT "FK_21266e62a69dbcfa54790ce00e7" FOREIGN KEY ("orgId") REFERENCES "orgs"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "agents" ADD CONSTRAINT "FK_ef998451a458221d3c409b37923" FOREIGN KEY ("modelId") REFERENCES "permitted_models"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "tool_config_record" ADD CONSTRAINT "FK_6d332070521471c40d83557db85" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ADD CONSTRAINT "FK_1890588e47e133fd85670f187d6" FOREIGN KEY ("orgId") REFERENCES "orgs"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }
}
