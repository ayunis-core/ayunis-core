import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Removes skill and knowledge-base sharing (AYC-1643). Afterwards a personal
 * skill or knowledge base is reachable only by its owner, so everything a
 * share recipient gained through it is deleted first: the cleanup the share
 * listeners did when a share was removed, which deleting rows in SQL skips.
 *
 * The rules key on ownership, not on the share rows, so state left behind by
 * shares deleted earlier is removed as well.
 */
export class RemoveSkillAndKnowledgeBaseShares1794375354198 implements MigrationInterface {
  name = 'RemoveSkillAndKnowledgeBaseShares1794375354198';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DELETE FROM "skill_activations" a USING "skills" s
       WHERE a."skillId" = s."id" AND s."userId" IS NOT NULL
         AND a."userId" <> s."userId"`,
    );
    await queryRunner.query(
      `DELETE FROM "knowledge_base_activations" a USING "knowledge_bases" kb
       WHERE a."knowledgeBaseId" = kb."id" AND kb."userId" IS NOT NULL
         AND a."userId" <> kb."userId"`,
    );
    await queryRunner.query(
      `DELETE FROM "thread_source_assignments" tsa USING "threads" t, "skills" s
       WHERE tsa."threadId" = t."id" AND s."id" = tsa."originSkillId"::varchar
         AND s."userId" IS NOT NULL AND t."userId" <> s."userId"`,
    );
    await queryRunner.query(
      `DELETE FROM "thread_knowledge_base_assignments" tka USING "threads" t, "knowledge_bases" kb
       WHERE tka."threadId" = t."id" AND tka."knowledgeBaseId" = kb."id"
         AND kb."userId" IS NOT NULL AND t."userId" <> kb."userId"`,
    );
    await queryRunner.query(
      `DELETE FROM "thread_knowledge_base_assignments" tka USING "threads" t, "skills" s
       WHERE tka."threadId" = t."id" AND s."id" = tka."originSkillId"::varchar
         AND s."userId" IS NOT NULL AND t."userId" <> s."userId"`,
    );
    // A personal skill can only link another user's knowledge base through a
    // knowledge-base share.
    await queryRunner.query(
      `DELETE FROM "skill_knowledge_bases" skb USING "skills" s, "knowledge_bases" kb
       WHERE skb."skillsId" = s."id" AND skb."knowledgeBasesId" = kb."id"
         AND s."userId" IS NOT NULL AND kb."userId" IS NOT NULL
         AND s."userId" <> kb."userId"`,
    );

    await queryRunner.query(`DROP TABLE "shares"`);
    await queryRunner.query(`DROP TABLE "share_scopes"`);
    await queryRunner.query(`DROP TYPE "share_scopes_scope_type_enum"`);
  }

  /**
   * Recreates the empty tables so the previous release can start again.
   * Deleted shares and the access state removed with them are not restored.
   */
  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "share_scopes_scope_type_enum" AS ENUM('org', 'team')`,
    );
    await queryRunner.query(
      `CREATE TABLE "share_scopes" ("id" character varying NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "scope_type" "share_scopes_scope_type_enum" NOT NULL, "orgId" character varying, "team_id" character varying, CONSTRAINT "PK_37f19f2043cfbcbd32e1f2f2058" PRIMARY KEY ("id"))`,
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
}
