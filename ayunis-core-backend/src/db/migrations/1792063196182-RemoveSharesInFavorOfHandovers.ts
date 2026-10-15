import type { MigrationInterface, QueryRunner } from 'typeorm';

export class RemoveSharesInFavorOfHandovers1792063196182 implements MigrationInterface {
  name = 'RemoveSharesInFavorOfHandovers1792063196182';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await this.requestHandoverOfSharedSkills(queryRunner);
    await this.requestHandoverOfSharedKnowledgeBases(queryRunner);
    await this.removeRecipientSkillUsage(queryRunner);
    await this.removeRecipientKnowledgeBaseUsage(queryRunner);
    await this.dropShares(queryRunner);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."share_scopes_scope_type_enum" AS ENUM('org', 'team')`,
    );
    await queryRunner.query(
      `CREATE TABLE "share_scopes" ("id" character varying NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "scope_type" "public"."share_scopes_scope_type_enum" NOT NULL, "orgId" character varying, "team_id" character varying, CONSTRAINT "PK_37f19f2043cfbcbd32e1f2f2058" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_63beedf9d70af84c2db055dcd5" ON "share_scopes" ("scope_type") `,
    );
    await queryRunner.query(
      `CREATE TABLE "shares" ("id" character varying NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "owner_id" character varying NOT NULL, "entity_type" character varying NOT NULL, "scope_id" character varying, "skill_id" character varying, "knowledge_base_id" character varying, CONSTRAINT "PK_b88473409066c43c2ccb1894a82" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_a8f5a2a6422644695744efc882" ON "shares" ("entity_type") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_cc15040a7ba74c2ac60a698df8" ON "shares" ("skill_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_9d58e41ed733832c1feaf146a6" ON "shares" ("knowledge_base_id") `,
    );
    await queryRunner.query(
      `ALTER TABLE "share_scopes" ADD CONSTRAINT "FK_39528fc94509356b645e84edb28" FOREIGN KEY ("orgId") REFERENCES "orgs"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "share_scopes" ADD CONSTRAINT "FK_7d18e4da60ee6666a761ed1b6da" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "shares" ADD CONSTRAINT "FK_adc3637e31eabc1b8cb3df5c27b" FOREIGN KEY ("scope_id") REFERENCES "share_scopes"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "shares" ADD CONSTRAINT "FK_cc15040a7ba74c2ac60a698df8f" FOREIGN KEY ("skill_id") REFERENCES "skills"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "shares" ADD CONSTRAINT "FK_9d58e41ed733832c1feaf146a62" FOREIGN KEY ("knowledge_base_id") REFERENCES "knowledge_bases"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  private async requestHandoverOfSharedSkills(
    queryRunner: QueryRunner,
  ): Promise<void> {
    await queryRunner.query(`
      INSERT INTO "handover_requests" ("id", "orgId", "resourceType", "skillId", "targetType", "targetTeamId", "requestedByUserId")
      SELECT gen_random_uuid()::text, u."orgId", 'skill', s."id",
        (CASE WHEN target.has_org THEN 'org' ELSE 'team' END)::"public"."handover_requests_targettype_enum",
        CASE WHEN target.has_org THEN NULL ELSE target.team_id END,
        s."userId"
      FROM "skills" s
      JOIN "users" u ON u."id" = s."userId"
      JOIN LATERAL (
        SELECT
          COALESCE(bool_or(sc."scope_type" = 'org' AND sc."orgId" = u."orgId"), false) AS has_org,
          COUNT(DISTINCT t."id") AS team_count,
          MIN(t."id") AS team_id
        FROM "shares" sh
        JOIN "share_scopes" sc ON sc."id" = sh."scope_id"
        LEFT JOIN "teams" t ON t."id" = sc."team_id" AND t."org_id" = u."orgId"
        WHERE sh."skill_id" = s."id"
      ) target ON target.has_org OR target.team_count = 1
      WHERE s."userId" IS NOT NULL
        AND s."workspaceId" IS NULL
        AND NOT EXISTS (
          SELECT 1 FROM "handover_requests" hr
          WHERE hr."skillId" = s."id" AND hr."status" = 'pending'
        )
    `);
  }

  private async requestHandoverOfSharedKnowledgeBases(
    queryRunner: QueryRunner,
  ): Promise<void> {
    await queryRunner.query(`
      INSERT INTO "handover_requests" ("id", "orgId", "resourceType", "knowledgeBaseId", "targetType", "targetTeamId", "requestedByUserId")
      SELECT gen_random_uuid()::text, kb."orgId", 'knowledge_base', kb."id",
        (CASE WHEN target.has_org THEN 'org' ELSE 'team' END)::"public"."handover_requests_targettype_enum",
        CASE WHEN target.has_org THEN NULL ELSE target.team_id END,
        kb."userId"
      FROM "knowledge_bases" kb
      JOIN LATERAL (
        SELECT
          COALESCE(bool_or(sc."scope_type" = 'org' AND sc."orgId" = kb."orgId"), false) AS has_org,
          COUNT(DISTINCT t."id") AS team_count,
          MIN(t."id") AS team_id
        FROM "shares" sh
        JOIN "share_scopes" sc ON sc."id" = sh."scope_id"
        LEFT JOIN "teams" t ON t."id" = sc."team_id" AND t."org_id" = kb."orgId"
        WHERE sh."knowledge_base_id" = kb."id"
      ) target ON target.has_org OR target.team_count = 1
      WHERE kb."userId" IS NOT NULL
        AND kb."workspaceId" IS NULL
        AND NOT EXISTS (
          SELECT 1 FROM "handover_requests" hr
          WHERE hr."knowledgeBaseId" = kb."id" AND hr."status" = 'pending'
        )
    `);
  }

  private async removeRecipientSkillUsage(
    queryRunner: QueryRunner,
  ): Promise<void> {
    const personalSkillOfAnotherUser = (userColumn: string) => `
      s."userId" IS NOT NULL AND ${userColumn} <> s."userId"`;

    await queryRunner.query(`
      DELETE FROM "thread_source_assignments" tsa
      USING "threads" th, "skills" s
      WHERE tsa."threadId" = th."id" AND tsa."originSkillId"::text = s."id"
        AND ${personalSkillOfAnotherUser('th."userId"')}
    `);
    await queryRunner.query(`
      DELETE FROM "thread_knowledge_base_assignments" tka
      USING "threads" th, "skills" s
      WHERE tka."threadId" = th."id" AND tka."originSkillId"::text = s."id"
        AND ${personalSkillOfAnotherUser('th."userId"')}
    `);
    await queryRunner.query(`
      DELETE FROM "skill_activations" sa
      USING "skills" s
      WHERE sa."skillId" = s."id"
        AND ${personalSkillOfAnotherUser('sa."userId"')}
    `);
  }

  private async removeRecipientKnowledgeBaseUsage(
    queryRunner: QueryRunner,
  ): Promise<void> {
    const personalKnowledgeBaseOfAnotherUser = (userColumn: string) => `
      kb."userId" IS NOT NULL AND ${userColumn} <> kb."userId"`;

    await queryRunner.query(`
      DELETE FROM "thread_knowledge_base_assignments" tka
      USING "threads" th, "knowledge_bases" kb
      WHERE tka."threadId" = th."id" AND tka."knowledgeBaseId" = kb."id"
        AND ${personalKnowledgeBaseOfAnotherUser('th."userId"')}
    `);
    await queryRunner.query(`
      DELETE FROM "skill_knowledge_bases" skb
      USING "skills" s, "knowledge_bases" kb
      WHERE skb."skillsId" = s."id" AND skb."knowledgeBasesId" = kb."id"
        AND s."userId" IS NOT NULL
        AND ${personalKnowledgeBaseOfAnotherUser('s."userId"')}
    `);
    await queryRunner.query(`
      DELETE FROM "knowledge_base_activations" ka
      USING "knowledge_bases" kb
      WHERE ka."knowledgeBaseId" = kb."id"
        AND ${personalKnowledgeBaseOfAnotherUser('ka."userId"')}
    `);
  }

  private async dropShares(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "shares"`);
    await queryRunner.query(`DROP TABLE "share_scopes"`);
    await queryRunner.query(
      `DROP TYPE "public"."share_scopes_scope_type_enum"`,
    );
  }
}
