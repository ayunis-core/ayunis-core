import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAgentSourceAssignments1756000000000 implements MigrationInterface {
  name = 'AddAgentSourceAssignments1756000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "agent_source_assignments" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        "agentId" uuid NOT NULL,
        "sourceId" uuid NOT NULL,
        CONSTRAINT "PK_agent_source_assignments" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      ALTER TABLE "agent_source_assignments" 
      ADD CONSTRAINT "FK_agent_source_assignments_agent" 
      FOREIGN KEY ("agentId") REFERENCES "agents"("id") ON DELETE CASCADE ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE "agent_source_assignments" 
      ADD CONSTRAINT "FK_agent_source_assignments_source" 
      FOREIGN KEY ("sourceId") REFERENCES "sources"("id") ON DELETE CASCADE ON UPDATE NO ACTION
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "agent_source_assignments" DROP CONSTRAINT "FK_agent_source_assignments_source"`);
    await queryRunner.query(`ALTER TABLE "agent_source_assignments" DROP CONSTRAINT "FK_agent_source_assignments_agent"`);
    await queryRunner.query(`DROP TABLE "agent_source_assignments"`);
  }
}