import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1750087277319 implements MigrationInterface {
  name = 'InitialSchema1750087277319';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Ensure pgvector extension is available before creating vector columns
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS vector`);

    await queryRunner.query(
      `CREATE TABLE "orgs" ("id" character varying NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "name" character varying NOT NULL, CONSTRAINT "PK_9eed8bfad4c9e0dc8648e090efe" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."users_role_enum" AS ENUM('admin', 'user')`,
    );
    await queryRunner.query(
      `CREATE TABLE "users" ("id" character varying NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "email" character varying NOT NULL, "name" character varying NOT NULL, "passwordHash" character varying NOT NULL, "role" "public"."users_role_enum" NOT NULL, "orgId" character varying NOT NULL, CONSTRAINT "UQ_97672ac88f789774dd47f7c8be3" UNIQUE ("email"), CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."invites_role_enum" AS ENUM('admin', 'user')`,
    );
    await queryRunner.query(
      `CREATE TABLE "invites" ("id" character varying NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "email" character varying NOT NULL, "orgId" character varying NOT NULL, "role" "public"."invites_role_enum" NOT NULL, "inviterId" character varying NOT NULL, "acceptedAt" TIMESTAMP, "expiresAt" TIMESTAMP NOT NULL, CONSTRAINT "UQ_08583b1882195ae2674f8391323" UNIQUE ("email"), CONSTRAINT "PK_aa52e96b44a714372f4dd31a0af" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_793ae9c8caed15d664b94156d1" ON "invites" ("orgId") `,
    );
    await queryRunner.query(
      `CREATE TABLE "tool_config_record" ("id" character varying NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "displayName" character varying NOT NULL, "userId" character varying NOT NULL, "endpointUrl" character varying, "method" character varying, "description" character varying, "type" character varying NOT NULL, CONSTRAINT "PK_be1bc5b3507405c8f75edb94aea" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_537c869f618ab10318e5ee2e46" ON "tool_config_record" ("type") `,
    );
    await queryRunner.query(
      `CREATE TABLE "toll_config_access_record" ("id" character varying NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "recipientId" character varying NOT NULL, "toolConfigId" character varying, CONSTRAINT "PK_1e6b2575e6725b2d8a97608163f" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_3944bbf50f20ff4aaec0f90f65" ON "toll_config_access_record" ("recipientId") `,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."messages_role_enum" AS ENUM('user', 'assistant', 'system', 'tool')`,
    );
    await queryRunner.query(
      `CREATE TABLE "messages" ("id" character varying NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "threadId" character varying NOT NULL, "role" "public"."messages_role_enum" NOT NULL, "content" jsonb NOT NULL, CONSTRAINT "PK_18325f38ae6de43878487eff986" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_15f9bd2bf472ff12b6ee20012d" ON "messages" ("threadId") `,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."permitted_models_provider_enum" AS ENUM('openai', 'anthropic', 'mistral', 'microsoft', 'ollama')`,
    );
    await queryRunner.query(
      `CREATE TABLE "permitted_models" ("id" character varying NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "orgId" character varying NOT NULL, "name" character varying NOT NULL, "provider" "public"."permitted_models_provider_enum" NOT NULL, "isDefault" boolean NOT NULL, CONSTRAINT "PK_02af329f565ce917de01284617e" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "threads" ("id" character varying NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "userId" character varying NOT NULL, "modelId" character varying NOT NULL, "title" character varying, "instruction" character varying, "isInternetSearchEnabled" boolean NOT NULL DEFAULT false, CONSTRAINT "PK_d8a74804c34fc3900502cd27275" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_256dd2e4946d6768c5583caa07" ON "threads" ("userId") `,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."sources_type_enum" AS ENUM('file', 'url')`,
    );
    await queryRunner.query(
      `CREATE TABLE "sources" ("id" character varying NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "threadId" character varying NOT NULL, "userId" character varying NOT NULL, "type" "public"."sources_type_enum" NOT NULL, "fileType" character varying, "fileSize" integer, "fileName" character varying, "url" character varying, CONSTRAINT "PK_85523beafe5a2a6b90b02096443" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_bfd43366e5c7a4cb70b27e0d56" ON "sources" ("threadId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_a1a5256bddf01199ae45258945" ON "sources" ("type") `,
    );
    await queryRunner.query(
      `CREATE TABLE "source_content_chunks" ("id" character varying NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "sourceId" character varying NOT NULL, "sourceContentId" character varying NOT NULL, "chunkContent" character varying NOT NULL, "vector" vector, "embeddingModel" character varying NOT NULL, "embeddingProvider" character varying NOT NULL, "embeddingDimension" integer NOT NULL, CONSTRAINT "PK_4a7b75088643fc9c3bd2723af63" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_bd61e255ed429f6f327137c3f6" ON "source_content_chunks" ("sourceId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_454f36c17f9a5c91ecb079852b" ON "source_content_chunks" ("sourceContentId") `,
    );
    await queryRunner.query(
      `CREATE TABLE "source_contents" ("id" character varying NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "content" character varying NOT NULL, "sourceId" character varying NOT NULL, CONSTRAINT "PK_2959eb814cb44e55307878f9d0b" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_cd23318cd6f5291584cfed1638" ON "source_contents" ("sourceId") `,
    );
    await queryRunner.query(
      `CREATE TABLE "prompts" ("id" character varying NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "title" character varying NOT NULL, "content" text NOT NULL, "userId" character varying NOT NULL, CONSTRAINT "PK_21f33798862975179e40b216a1d" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_fd2aed4018953e15ce70f65b42" ON "prompts" ("userId") `,
    );
    await queryRunner.query(
      `CREATE TABLE "user_default_models" ("id" character varying NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "userId" character varying NOT NULL, "modelId" character varying NOT NULL, CONSTRAINT "PK_57ffe4d8e061d080ba4703e465a" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_2068066be6ef39ebd1aba35256" ON "user_default_models" ("userId") `,
    );
    await queryRunner.query(
      `CREATE TABLE "agents" ("id" character varying NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "name" character varying NOT NULL, "instructions" character varying NOT NULL, "modelId" character varying NOT NULL, "userId" character varying NOT NULL, CONSTRAINT "PK_9c653f28ae19c5884d5baf6a1d9" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."agent_tools_tooltype_enum" AS ENUM('http', 'source_query', 'internet_search', 'website_content')`,
    );
    await queryRunner.query(
      `CREATE TABLE "agent_tools" ("id" character varying NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "agentId" character varying NOT NULL, "toolType" "public"."agent_tools_tooltype_enum" NOT NULL, "toolConfigId" character varying, CONSTRAINT "PK_950db085e94f8d3fd8b9728d62b" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_ed18c00c9aa6bede04bbb74d98" ON "agent_tools" ("agentId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_3539fb662043be3ed6ca418dfa" ON "agent_tools" ("toolType") `,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ADD CONSTRAINT "FK_1890588e47e133fd85670f187d6" FOREIGN KEY ("orgId") REFERENCES "orgs"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "invites" ADD CONSTRAINT "FK_793ae9c8caed15d664b94156d1e" FOREIGN KEY ("orgId") REFERENCES "orgs"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "invites" ADD CONSTRAINT "FK_fba2934931761bc4c620e1b180f" FOREIGN KEY ("inviterId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "tool_config_record" ADD CONSTRAINT "FK_6d332070521471c40d83557db85" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "toll_config_access_record" ADD CONSTRAINT "FK_9a15db9872dca0a305b85f2be03" FOREIGN KEY ("toolConfigId") REFERENCES "tool_config_record"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "messages" ADD CONSTRAINT "FK_15f9bd2bf472ff12b6ee20012d0" FOREIGN KEY ("threadId") REFERENCES "threads"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "permitted_models" ADD CONSTRAINT "FK_42e986c90adc276c6bab6ae1eb7" FOREIGN KEY ("orgId") REFERENCES "orgs"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "threads" ADD CONSTRAINT "FK_16a4760316ad946a5b114b27d12" FOREIGN KEY ("modelId") REFERENCES "permitted_models"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "sources" ADD CONSTRAINT "FK_bfd43366e5c7a4cb70b27e0d563" FOREIGN KEY ("threadId") REFERENCES "threads"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "source_content_chunks" ADD CONSTRAINT "FK_bd61e255ed429f6f327137c3f69" FOREIGN KEY ("sourceId") REFERENCES "sources"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "source_content_chunks" ADD CONSTRAINT "FK_454f36c17f9a5c91ecb079852bb" FOREIGN KEY ("sourceContentId") REFERENCES "source_contents"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "source_contents" ADD CONSTRAINT "FK_cd23318cd6f5291584cfed1638d" FOREIGN KEY ("sourceId") REFERENCES "sources"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_default_models" ADD CONSTRAINT "FK_b57e1a54cec228b7369d1ededdd" FOREIGN KEY ("modelId") REFERENCES "permitted_models"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "agents" ADD CONSTRAINT "FK_ef998451a458221d3c409b37923" FOREIGN KEY ("modelId") REFERENCES "permitted_models"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "agents" ADD CONSTRAINT "FK_f535e5b2c0f0dc7b7fc656ebc91" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "agent_tools" ADD CONSTRAINT "FK_ed18c00c9aa6bede04bbb74d980" FOREIGN KEY ("agentId") REFERENCES "agents"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "agent_tools" ADD CONSTRAINT "FK_e3ff93a830482bcce1b1e264e4e" FOREIGN KEY ("toolConfigId") REFERENCES "tool_config_record"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "agent_tools" DROP CONSTRAINT "FK_e3ff93a830482bcce1b1e264e4e"`,
    );
    await queryRunner.query(
      `ALTER TABLE "agent_tools" DROP CONSTRAINT "FK_ed18c00c9aa6bede04bbb74d980"`,
    );
    await queryRunner.query(
      `ALTER TABLE "agents" DROP CONSTRAINT "FK_f535e5b2c0f0dc7b7fc656ebc91"`,
    );
    await queryRunner.query(
      `ALTER TABLE "agents" DROP CONSTRAINT "FK_ef998451a458221d3c409b37923"`,
    );
    await queryRunner.query(
      `ALTER TABLE "user_default_models" DROP CONSTRAINT "FK_b57e1a54cec228b7369d1ededdd"`,
    );
    await queryRunner.query(
      `ALTER TABLE "source_contents" DROP CONSTRAINT "FK_cd23318cd6f5291584cfed1638d"`,
    );
    await queryRunner.query(
      `ALTER TABLE "source_content_chunks" DROP CONSTRAINT "FK_454f36c17f9a5c91ecb079852bb"`,
    );
    await queryRunner.query(
      `ALTER TABLE "source_content_chunks" DROP CONSTRAINT "FK_bd61e255ed429f6f327137c3f69"`,
    );
    await queryRunner.query(
      `ALTER TABLE "sources" DROP CONSTRAINT "FK_bfd43366e5c7a4cb70b27e0d563"`,
    );
    await queryRunner.query(
      `ALTER TABLE "threads" DROP CONSTRAINT "FK_16a4760316ad946a5b114b27d12"`,
    );
    await queryRunner.query(
      `ALTER TABLE "permitted_models" DROP CONSTRAINT "FK_42e986c90adc276c6bab6ae1eb7"`,
    );
    await queryRunner.query(
      `ALTER TABLE "messages" DROP CONSTRAINT "FK_15f9bd2bf472ff12b6ee20012d0"`,
    );
    await queryRunner.query(
      `ALTER TABLE "toll_config_access_record" DROP CONSTRAINT "FK_9a15db9872dca0a305b85f2be03"`,
    );
    await queryRunner.query(
      `ALTER TABLE "tool_config_record" DROP CONSTRAINT "FK_6d332070521471c40d83557db85"`,
    );
    await queryRunner.query(
      `ALTER TABLE "invites" DROP CONSTRAINT "FK_fba2934931761bc4c620e1b180f"`,
    );
    await queryRunner.query(
      `ALTER TABLE "invites" DROP CONSTRAINT "FK_793ae9c8caed15d664b94156d1e"`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" DROP CONSTRAINT "FK_1890588e47e133fd85670f187d6"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_3539fb662043be3ed6ca418dfa"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_ed18c00c9aa6bede04bbb74d98"`,
    );
    await queryRunner.query(`DROP TABLE "agent_tools"`);
    await queryRunner.query(`DROP TYPE "public"."agent_tools_tooltype_enum"`);
    await queryRunner.query(`DROP TABLE "agents"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_2068066be6ef39ebd1aba35256"`,
    );
    await queryRunner.query(`DROP TABLE "user_default_models"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_fd2aed4018953e15ce70f65b42"`,
    );
    await queryRunner.query(`DROP TABLE "prompts"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_cd23318cd6f5291584cfed1638"`,
    );
    await queryRunner.query(`DROP TABLE "source_contents"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_454f36c17f9a5c91ecb079852b"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_bd61e255ed429f6f327137c3f6"`,
    );
    await queryRunner.query(`DROP TABLE "source_content_chunks"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_a1a5256bddf01199ae45258945"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_bfd43366e5c7a4cb70b27e0d56"`,
    );
    await queryRunner.query(`DROP TABLE "sources"`);
    await queryRunner.query(`DROP TYPE "public"."sources_type_enum"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_256dd2e4946d6768c5583caa07"`,
    );
    await queryRunner.query(`DROP TABLE "threads"`);
    await queryRunner.query(`DROP TABLE "permitted_models"`);
    await queryRunner.query(
      `DROP TYPE "public"."permitted_models_provider_enum"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_15f9bd2bf472ff12b6ee20012d"`,
    );
    await queryRunner.query(`DROP TABLE "messages"`);
    await queryRunner.query(`DROP TYPE "public"."messages_role_enum"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_3944bbf50f20ff4aaec0f90f65"`,
    );
    await queryRunner.query(`DROP TABLE "toll_config_access_record"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_537c869f618ab10318e5ee2e46"`,
    );
    await queryRunner.query(`DROP TABLE "tool_config_record"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_793ae9c8caed15d664b94156d1"`,
    );
    await queryRunner.query(`DROP TABLE "invites"`);
    await queryRunner.query(`DROP TYPE "public"."invites_role_enum"`);
    await queryRunner.query(`DROP TABLE "users"`);
    await queryRunner.query(`DROP TYPE "public"."users_role_enum"`);
    await queryRunner.query(`DROP TABLE "orgs"`);
  }
}
