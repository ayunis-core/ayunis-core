import type { MigrationInterface, QueryRunner } from 'typeorm';

export class MigrateAgentsAndPromptsToSkills1772627745700 implements MigrationInterface {
  name = 'MigrateAgentsAndPromptsToSkills1772627745700';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create temp mapping tables
    await queryRunner.query(`
      CREATE TEMP TABLE _agent_skill_map (
        agent_id character varying NOT NULL,
        skill_id character varying NOT NULL
      )
    `);

    await queryRunner.query(`
      CREATE TEMP TABLE _prompt_skill_map (
        prompt_id character varying NOT NULL,
        skill_id character varying NOT NULL
      )
    `);

    // =========================================================================
    // 1a. Migrate agents to skills
    // =========================================================================
    // Uses PL/pgSQL to handle name sanitization and conflict resolution per-row.
    await queryRunner.query(`
      DO $$
      DECLARE
        r RECORD;
        sanitized TEXT;
        candidate TEXT;
        new_id TEXT;
        suffix INT;
      BEGIN
        FOR r IN SELECT a."id", a."name", a."instructions", a."userId", a."createdAt", a."updatedAt"
                 FROM "agents" a
                 JOIN "users" u ON u."id" = a."userId"
        LOOP
          -- Sanitize: replace characters that are not alphanumeric, spaces, or hyphens
          sanitized := regexp_replace(r."name", '[^[:alnum:] -]', '-', 'g');
          -- Collapse consecutive hyphens into one
          sanitized := regexp_replace(sanitized, '-{2,}', '-', 'g');
          -- Collapse consecutive spaces into one
          sanitized := regexp_replace(sanitized, ' {2,}', ' ', 'g');
          -- Trim leading/trailing hyphens, spaces, underscores
          sanitized := regexp_replace(sanitized, '^[[:space:]_-]+', '');
          sanitized := regexp_replace(sanitized, '[[:space:]_-]+$', '');
          -- Fallback if empty
          IF sanitized = '' OR sanitized IS NULL THEN
            sanitized := 'Migrated Agent';
          END IF;

          -- Resolve uniqueness conflicts against skills table
          candidate := sanitized;
          suffix := 1;
          WHILE EXISTS (SELECT 1 FROM "skills" WHERE "name" = candidate AND "userId" = r."userId") LOOP
            IF suffix = 1 THEN
              candidate := sanitized || ' (migrated)';
            ELSE
              candidate := sanitized || ' (migrated ' || suffix || ')';
            END IF;
            suffix := suffix + 1;
          END LOOP;

          new_id := gen_random_uuid()::text;

          INSERT INTO "skills" ("id", "name", "shortDescription", "instructions", "marketplaceIdentifier", "userId", "createdAt", "updatedAt")
          VALUES (new_id, candidate, candidate, r."instructions", NULL, r."userId", r."createdAt", r."updatedAt");

          INSERT INTO _agent_skill_map (agent_id, skill_id) VALUES (r."id", new_id);
        END LOOP;
      END $$;
    `);

    // =========================================================================
    // 1b. Copy agent source assignments
    // =========================================================================
    await queryRunner.query(`
      INSERT INTO "skill_sources" ("skillsId", "sourcesId")
      SELECT m.skill_id, asa."sourceId"
      FROM "agent_source_assignments" asa
      JOIN _agent_skill_map m ON m.agent_id = asa."agentId"
      ON CONFLICT DO NOTHING
    `);

    // =========================================================================
    // 1c. Copy agent MCP integrations
    // =========================================================================
    await queryRunner.query(`
      INSERT INTO "skill_mcp_integrations" ("skillsId", "mcpIntegrationsId")
      SELECT m.skill_id, ami."mcpIntegrationsId"
      FROM "agent_mcp_integrations" ami
      JOIN _agent_skill_map m ON m.agent_id = ami."agentsId"
      ON CONFLICT DO NOTHING
    `);

    // =========================================================================
    // 1d. Convert agent shares to skill shares
    // =========================================================================
    await queryRunner.query(`
      UPDATE "shares"
      SET "entity_type" = 'skill',
          "skill_id" = m.skill_id,
          "agent_id" = NULL
      FROM _agent_skill_map m
      WHERE "shares"."agent_id" = m.agent_id
        AND "shares"."entity_type" = 'agent'
    `);

    // =========================================================================
    // 1e. Create skill activations for migrated agent skills
    // =========================================================================
    await queryRunner.query(`
      INSERT INTO "skill_activations" ("id", "skillId", "userId", "isPinned", "createdAt")
      SELECT gen_random_uuid(), m.skill_id, s."userId", false, NOW()
      FROM _agent_skill_map m
      JOIN "skills" s ON s."id" = m.skill_id
      ON CONFLICT DO NOTHING
    `);

    // =========================================================================
    // 1f. Migrate prompts to skills
    // =========================================================================
    await queryRunner.query(`
      DO $$
      DECLARE
        r RECORD;
        sanitized TEXT;
        candidate TEXT;
        new_id TEXT;
        suffix INT;
      BEGIN
        FOR r IN SELECT p."id", p."title", p."content", p."userId", p."createdAt", p."updatedAt"
                 FROM "prompts" p
                 JOIN "users" u ON u."id" = p."userId"
        LOOP
          -- Sanitize: replace characters that are not alphanumeric, spaces, or hyphens
          sanitized := regexp_replace(r."title", '[^[:alnum:] -]', '-', 'g');
          -- Collapse consecutive hyphens into one
          sanitized := regexp_replace(sanitized, '-{2,}', '-', 'g');
          -- Collapse consecutive spaces into one
          sanitized := regexp_replace(sanitized, ' {2,}', ' ', 'g');
          -- Trim leading/trailing hyphens, spaces, underscores
          sanitized := regexp_replace(sanitized, '^[[:space:]_-]+', '');
          sanitized := regexp_replace(sanitized, '[[:space:]_-]+$', '');
          -- Fallback if empty
          IF sanitized = '' OR sanitized IS NULL THEN
            sanitized := 'Migrated Prompt';
          END IF;

          -- Resolve uniqueness conflicts (including previously migrated agents)
          candidate := sanitized;
          suffix := 1;
          WHILE EXISTS (SELECT 1 FROM "skills" WHERE "name" = candidate AND "userId" = r."userId") LOOP
            IF suffix = 1 THEN
              candidate := sanitized || ' (migrated)';
            ELSE
              candidate := sanitized || ' (migrated ' || suffix || ')';
            END IF;
            suffix := suffix + 1;
          END LOOP;

          new_id := gen_random_uuid()::text;

          INSERT INTO "skills" ("id", "name", "shortDescription", "instructions", "marketplaceIdentifier", "userId", "createdAt", "updatedAt")
          VALUES (new_id, candidate, candidate, r."content", NULL, r."userId", r."createdAt", r."updatedAt");

          INSERT INTO _prompt_skill_map (prompt_id, skill_id) VALUES (r."id", new_id);
        END LOOP;
      END $$;
    `);

    // =========================================================================
    // 1g. Create skill activations for migrated prompt skills
    // =========================================================================
    await queryRunner.query(`
      INSERT INTO "skill_activations" ("id", "skillId", "userId", "isPinned", "createdAt")
      SELECT gen_random_uuid(), m.skill_id, s."userId", false, NOW()
      FROM _prompt_skill_map m
      JOIN "skills" s ON s."id" = m.skill_id
      ON CONFLICT DO NOTHING
    `);

    // =========================================================================
    // 1h. Clean up temp tables
    // =========================================================================
    await queryRunner.query(`DROP TABLE IF EXISTS _agent_skill_map`);
    await queryRunner.query(`DROP TABLE IF EXISTS _prompt_skill_map`);
  }

  public down(): Promise<void> {
    // No-op: migrated skills remain. Reverting simply means new agents/prompts
    // won't be migrated — already-migrated data stays as skills.
    return Promise.resolve();
  }
}
