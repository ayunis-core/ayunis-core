import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateOparlMirrorTables1795478677149 implements MigrationInterface {
  name = 'CreateOparlMirrorTables1795478677149';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."oparl_systems_lastrunstatus_enum" AS ENUM('running', 'succeeded', 'suspicious', 'failed')`,
    );
    await queryRunner.query(
      `CREATE TABLE "oparl_systems" ("id" character varying NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "url" text NOT NULL, "oparlId" text NOT NULL, "name" text, "vendor" text, "product" text, "oparlVersion" text, "website" text, "raw" jsonb NOT NULL, "nextSyncAt" TIMESTAMP WITH TIME ZONE NOT NULL, "lastDeltaSyncAt" TIMESTAMP WITH TIME ZONE, "lastFullSyncAt" TIMESTAMP WITH TIME ZONE, "lastRunStatus" "public"."oparl_systems_lastrunstatus_enum", "lastRunFinishedAt" TIMESTAMP WITH TIME ZONE, "lastError" text, "consecutiveFailures" integer NOT NULL DEFAULT '0', CONSTRAINT "UQ_38db7223bf95e81a9c2af9e03f0" UNIQUE ("url"), CONSTRAINT "UQ_d9070dc234fbda4a3843e719a48" UNIQUE ("oparlId"), CONSTRAINT "PK_08d6a1759f1b51dfcf8758a5cdf" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_2e2632b4337f957db1a10ba613" ON "oparl_systems" ("nextSyncAt") `,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."oparl_sync_runs_kind_enum" AS ENUM('initial', 'delta', 'full')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."oparl_sync_runs_status_enum" AS ENUM('running', 'succeeded', 'suspicious', 'failed')`,
    );
    await queryRunner.query(
      `CREATE TABLE "oparl_sync_runs" ("id" character varying NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "systemId" character varying NOT NULL, "kind" "public"."oparl_sync_runs_kind_enum" NOT NULL, "status" "public"."oparl_sync_runs_status_enum" NOT NULL, "modifiedSince" TIMESTAMP WITH TIME ZONE, "startedAt" TIMESTAMP WITH TIME ZONE NOT NULL, "finishedAt" TIMESTAMP WITH TIME ZONE, "error" text, "stats" jsonb NOT NULL, CONSTRAINT "PK_0b297536bd81d04b76fd7a91164" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_ea16dd0aaeb7a8c51bdae515c9" ON "oparl_sync_runs" ("systemId", "startedAt") `,
    );
    await queryRunner.query(
      `CREATE TABLE "oparl_sync_listed_objects" ("runId" character varying NOT NULL, "entityType" text NOT NULL, "oparlId" text NOT NULL, CONSTRAINT "PK_90fcb5850287130943259749b54" PRIMARY KEY ("runId", "entityType", "oparlId"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "oparl_persons" ("id" character varying NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "systemId" character varying NOT NULL, "oparlId" text NOT NULL, "web" text, "oparlCreated" TIMESTAMP WITH TIME ZONE, "oparlModified" TIMESTAMP WITH TIME ZONE, "raw" jsonb NOT NULL, "fromListing" boolean NOT NULL DEFAULT false, "bodyId" character varying NOT NULL, "name" text, "familyName" text, "givenName" text, "formOfAddress" text, "affix" text, "title" text array, "gender" text, "status" text array, CONSTRAINT "UQ_8055a24ae73ad36cdbd5677c5e0" UNIQUE ("systemId", "oparlId"), CONSTRAINT "PK_c0d1538ce75267cf1381d9cc49c" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_42dc7032cc977875a7927587b2" ON "oparl_persons" ("bodyId") `,
    );
    await queryRunner.query(
      `CREATE TABLE "oparl_files" ("id" character varying NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "systemId" character varying NOT NULL, "oparlId" text NOT NULL, "web" text, "oparlCreated" TIMESTAMP WITH TIME ZONE, "oparlModified" TIMESTAMP WITH TIME ZONE, "raw" jsonb NOT NULL, "fromListing" boolean NOT NULL DEFAULT false, "bodyId" character varying NOT NULL, "name" text, "fileName" text, "mimeType" text, "date" date, "size" bigint, "sha1Checksum" text, "sha512Checksum" text, "accessUrl" text, "downloadUrl" text, "externalServiceUrl" text, "fileLicense" text, "masterFileOparlId" text, "masterFileId" character varying, CONSTRAINT "UQ_71a95fc0b0dbcc3d807c6162575" UNIQUE ("systemId", "oparlId"), CONSTRAINT "PK_08f064f42bfd237de1a3c2e6f41" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_f0967c3b0cdb04024c625b22e0" ON "oparl_files" ("bodyId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_dbf94310d35ad1f3efc1210b37" ON "oparl_files" ("masterFileId") `,
    );
    await queryRunner.query(
      `CREATE TABLE "oparl_papers" ("id" character varying NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "systemId" character varying NOT NULL, "oparlId" text NOT NULL, "web" text, "oparlCreated" TIMESTAMP WITH TIME ZONE, "oparlModified" TIMESTAMP WITH TIME ZONE, "raw" jsonb NOT NULL, "fromListing" boolean NOT NULL DEFAULT false, "bodyId" character varying NOT NULL, "name" text, "reference" text, "date" date, "paperType" text, "mainFileOparlId" text, "mainFileId" character varying, CONSTRAINT "UQ_396a2f470823f5ddc4866c086b0" UNIQUE ("systemId", "oparlId"), CONSTRAINT "PK_fa98dcd49de4cca0032ea4118ba" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_55da59ad5280f46be4f0b08551" ON "oparl_papers" ("bodyId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_944b99055dbd41a9aedcfb7b1a" ON "oparl_papers" ("mainFileId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_4dbb39ad91ececf77c80a2966f" ON "oparl_papers" ("bodyId", "date") `,
    );
    await queryRunner.query(
      `CREATE TABLE "oparl_locations" ("id" character varying NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "systemId" character varying NOT NULL, "oparlId" text NOT NULL, "web" text, "oparlCreated" TIMESTAMP WITH TIME ZONE, "oparlModified" TIMESTAMP WITH TIME ZONE, "raw" jsonb NOT NULL, "fromListing" boolean NOT NULL DEFAULT false, "bodyId" character varying NOT NULL, "description" text, "streetAddress" text, "room" text, "postalCode" text, "subLocality" text, "locality" text, CONSTRAINT "UQ_d3efbe640553b3e1055eaf01786" UNIQUE ("systemId", "oparlId"), CONSTRAINT "PK_c66683979a4e6a7b2dac8481cd5" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_dcec9c3a77ea9182d160c399e6" ON "oparl_locations" ("bodyId") `,
    );
    await queryRunner.query(
      `CREATE TABLE "oparl_organizations" ("id" character varying NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "systemId" character varying NOT NULL, "oparlId" text NOT NULL, "web" text, "oparlCreated" TIMESTAMP WITH TIME ZONE, "oparlModified" TIMESTAMP WITH TIME ZONE, "raw" jsonb NOT NULL, "fromListing" boolean NOT NULL DEFAULT false, "bodyId" character varying NOT NULL, "name" text, "shortName" text, "organizationType" text, "classification" text, "post" text array, "startDate" date, "endDate" date, "website" text, "subOrganizationOfOparlId" text, "subOrganizationOfId" character varying, "locationOparlId" text, "locationId" character varying, CONSTRAINT "UQ_6b9cd65b5dc4a86f09d8afb321f" UNIQUE ("systemId", "oparlId"), CONSTRAINT "PK_64763cab4d7faf9db0bb15bf7c0" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_11e3fa71fd50ef6b65c5258264" ON "oparl_organizations" ("bodyId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_7ad8086be20f3a28b8bd915753" ON "oparl_organizations" ("subOrganizationOfId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_626dbcd112619752ba2b826c85" ON "oparl_organizations" ("locationId") `,
    );
    await queryRunner.query(
      `CREATE TABLE "oparl_paper_under_direction_of" ("ownerId" character varying NOT NULL, "targetOparlId" text NOT NULL, "targetId" character varying, CONSTRAINT "PK_51614a0b2126221e95e57239b7e" PRIMARY KEY ("ownerId", "targetOparlId"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_020b70b418b3fbd17019183074" ON "oparl_paper_under_direction_of" ("targetId") `,
    );
    await queryRunner.query(
      `CREATE TABLE "oparl_paper_superordinated_papers" ("ownerId" character varying NOT NULL, "targetOparlId" text NOT NULL, "targetId" character varying, CONSTRAINT "PK_2a42621c17465cd7c47b3446f3a" PRIMARY KEY ("ownerId", "targetOparlId"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_026a273e0df247c19b4e2b82ac" ON "oparl_paper_superordinated_papers" ("targetId") `,
    );
    await queryRunner.query(
      `CREATE TABLE "oparl_paper_subordinated_papers" ("ownerId" character varying NOT NULL, "targetOparlId" text NOT NULL, "targetId" character varying, CONSTRAINT "PK_83711e976cd728b79a85d6c597a" PRIMARY KEY ("ownerId", "targetOparlId"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_9147592788de995b6a03b7b157" ON "oparl_paper_subordinated_papers" ("targetId") `,
    );
    await queryRunner.query(
      `CREATE TABLE "oparl_paper_related_papers" ("ownerId" character varying NOT NULL, "targetOparlId" text NOT NULL, "targetId" character varying, CONSTRAINT "PK_2d36de45e20226f172dfab2ac26" PRIMARY KEY ("ownerId", "targetOparlId"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_ea531f9ba2faf3fcf1d8b0fb20" ON "oparl_paper_related_papers" ("targetId") `,
    );
    await queryRunner.query(
      `CREATE TABLE "oparl_paper_originator_persons" ("ownerId" character varying NOT NULL, "targetOparlId" text NOT NULL, "targetId" character varying, CONSTRAINT "PK_d53a8a6ada5019240155b1df41d" PRIMARY KEY ("ownerId", "targetOparlId"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_db7cf0d24b1330194d2b3e058c" ON "oparl_paper_originator_persons" ("targetId") `,
    );
    await queryRunner.query(
      `CREATE TABLE "oparl_paper_originator_organizations" ("ownerId" character varying NOT NULL, "targetOparlId" text NOT NULL, "targetId" character varying, CONSTRAINT "PK_429c3f976e4e7a8fa2020870dce" PRIMARY KEY ("ownerId", "targetOparlId"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_080c2d34e4f39f05b93bf8affb" ON "oparl_paper_originator_organizations" ("targetId") `,
    );
    await queryRunner.query(
      `CREATE TABLE "oparl_paper_locations" ("ownerId" character varying NOT NULL, "targetOparlId" text NOT NULL, "targetId" character varying, CONSTRAINT "PK_3dcb8e5f06d3173eb009b018ed0" PRIMARY KEY ("ownerId", "targetOparlId"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_a9142616f3c38eca9e4916af9e" ON "oparl_paper_locations" ("targetId") `,
    );
    await queryRunner.query(
      `CREATE TABLE "oparl_paper_auxiliary_files" ("ownerId" character varying NOT NULL, "targetOparlId" text NOT NULL, "targetId" character varying, CONSTRAINT "PK_49c4140add1a63519940cca7492" PRIMARY KEY ("ownerId", "targetOparlId"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_8b90e5fb6defca67eef9cfd64a" ON "oparl_paper_auxiliary_files" ("targetId") `,
    );
    await queryRunner.query(
      `CREATE TABLE "oparl_memberships" ("id" character varying NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "systemId" character varying NOT NULL, "oparlId" text NOT NULL, "web" text, "oparlCreated" TIMESTAMP WITH TIME ZONE, "oparlModified" TIMESTAMP WITH TIME ZONE, "raw" jsonb NOT NULL, "fromListing" boolean NOT NULL DEFAULT false, "bodyId" character varying NOT NULL, "role" text, "votingRight" boolean, "startDate" date, "endDate" date, "personOparlId" text, "personId" character varying, "organizationOparlId" text, "organizationId" character varying, "onBehalfOfOparlId" text, "onBehalfOfId" character varying, CONSTRAINT "UQ_576c726bace8bf6e9cc9e9587a0" UNIQUE ("systemId", "oparlId"), CONSTRAINT "PK_9a21d20df3bbdef820e610ff685" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_fd51bbf735811fdc72c1ab8dcb" ON "oparl_memberships" ("bodyId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_893403d87a78a144c9cb20a768" ON "oparl_memberships" ("personId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_86ae7b780cac4964101744a7ab" ON "oparl_memberships" ("organizationId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_2a621de7b649ee5378a34a1156" ON "oparl_memberships" ("onBehalfOfId") `,
    );
    await queryRunner.query(
      `CREATE TABLE "oparl_meetings" ("id" character varying NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "systemId" character varying NOT NULL, "oparlId" text NOT NULL, "web" text, "oparlCreated" TIMESTAMP WITH TIME ZONE, "oparlModified" TIMESTAMP WITH TIME ZONE, "raw" jsonb NOT NULL, "fromListing" boolean NOT NULL DEFAULT false, "bodyId" character varying NOT NULL, "name" text, "meetingState" text, "cancelled" boolean, "start" TIMESTAMP WITH TIME ZONE, "end" TIMESTAMP WITH TIME ZONE, "locationOparlId" text, "locationId" character varying, "invitationOparlId" text, "invitationId" character varying, "resultsProtocolOparlId" text, "resultsProtocolId" character varying, "verbatimProtocolOparlId" text, "verbatimProtocolId" character varying, CONSTRAINT "UQ_bf7f9f7ec8621a660e7dd6e0c12" UNIQUE ("systemId", "oparlId"), CONSTRAINT "PK_4704934c84f52c882e5b0075f9f" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_eed4963358997e73250949b257" ON "oparl_meetings" ("bodyId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_0a6f0399593c2d5add31c55936" ON "oparl_meetings" ("locationId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_8c5a6b986068c3c34e34222a4a" ON "oparl_meetings" ("invitationId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_bf2db31409ff9703caee782d2e" ON "oparl_meetings" ("resultsProtocolId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_044540a61c908e4e0894f4158f" ON "oparl_meetings" ("verbatimProtocolId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_c52af2ba2b639357aba39b092e" ON "oparl_meetings" ("bodyId", "start") `,
    );
    await queryRunner.query(
      `CREATE TABLE "oparl_meeting_participants" ("ownerId" character varying NOT NULL, "targetOparlId" text NOT NULL, "targetId" character varying, CONSTRAINT "PK_cfbb689a6fd150f0ef1bc4adaa2" PRIMARY KEY ("ownerId", "targetOparlId"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_3c04ff0d55fe27f032587c89b8" ON "oparl_meeting_participants" ("targetId") `,
    );
    await queryRunner.query(
      `CREATE TABLE "oparl_meeting_organizations" ("ownerId" character varying NOT NULL, "targetOparlId" text NOT NULL, "targetId" character varying, CONSTRAINT "PK_c5544eba67028b0067378cd3e87" PRIMARY KEY ("ownerId", "targetOparlId"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_dc686dce3305f296958c308afb" ON "oparl_meeting_organizations" ("targetId") `,
    );
    await queryRunner.query(
      `CREATE TABLE "oparl_meeting_auxiliary_files" ("ownerId" character varying NOT NULL, "targetOparlId" text NOT NULL, "targetId" character varying, CONSTRAINT "PK_657aad40d8bc78de8faafd97428" PRIMARY KEY ("ownerId", "targetOparlId"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_693d0be9c148d758fef280b719" ON "oparl_meeting_auxiliary_files" ("targetId") `,
    );
    await queryRunner.query(
      `CREATE TABLE "oparl_legislative_terms" ("id" character varying NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "systemId" character varying NOT NULL, "oparlId" text NOT NULL, "web" text, "oparlCreated" TIMESTAMP WITH TIME ZONE, "oparlModified" TIMESTAMP WITH TIME ZONE, "raw" jsonb NOT NULL, "fromListing" boolean NOT NULL DEFAULT false, "bodyId" character varying NOT NULL, "name" text, "startDate" date, "endDate" date, CONSTRAINT "UQ_3e95b338018394114749ebf95ee" UNIQUE ("systemId", "oparlId"), CONSTRAINT "PK_f545de93ecdaab7e18ece3e76da" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_4acc2a21f3d0925c907ddf9a73" ON "oparl_legislative_terms" ("bodyId") `,
    );
    await queryRunner.query(
      `CREATE TABLE "oparl_agenda_items" ("id" character varying NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "systemId" character varying NOT NULL, "oparlId" text NOT NULL, "web" text, "oparlCreated" TIMESTAMP WITH TIME ZONE, "oparlModified" TIMESTAMP WITH TIME ZONE, "raw" jsonb NOT NULL, "fromListing" boolean NOT NULL DEFAULT false, "bodyId" character varying NOT NULL, "number" text, "order" integer, "name" text, "public" boolean, "result" text, "resolutionText" text, "start" TIMESTAMP WITH TIME ZONE, "end" TIMESTAMP WITH TIME ZONE, "meetingOparlId" text, "meetingId" character varying, "consultationOparlId" text, "consultationId" character varying, "resolutionFileOparlId" text, "resolutionFileId" character varying, CONSTRAINT "UQ_4b462ae1e52d6b69f4d1a25efa8" UNIQUE ("systemId", "oparlId"), CONSTRAINT "PK_ab97dd118d7847234eaa54abc11" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_15e82ae6aee6bc58e683181734" ON "oparl_agenda_items" ("bodyId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_80a6a8f1ff9ba1267fdcc33c78" ON "oparl_agenda_items" ("meetingId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_6901826eb49fd5473411c58d31" ON "oparl_agenda_items" ("consultationId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_a2159420a7261f6d1d9421d5af" ON "oparl_agenda_items" ("resolutionFileId") `,
    );
    await queryRunner.query(
      `CREATE TABLE "oparl_consultations" ("id" character varying NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "systemId" character varying NOT NULL, "oparlId" text NOT NULL, "web" text, "oparlCreated" TIMESTAMP WITH TIME ZONE, "oparlModified" TIMESTAMP WITH TIME ZONE, "raw" jsonb NOT NULL, "fromListing" boolean NOT NULL DEFAULT false, "bodyId" character varying NOT NULL, "role" text, "authoritative" boolean, "paperOparlId" text, "paperId" character varying, "agendaItemOparlId" text, "agendaItemId" character varying, "meetingOparlId" text, "meetingId" character varying, CONSTRAINT "UQ_06392fd610509c49ed23e581998" UNIQUE ("systemId", "oparlId"), CONSTRAINT "PK_971e5c6e8173cd1508dc41d660e" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_2ce23a706b67f3de15c8839f6a" ON "oparl_consultations" ("bodyId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_9e306cc21cd670c4e832c7c9f9" ON "oparl_consultations" ("paperId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_334ca58ce668c55b931b071c89" ON "oparl_consultations" ("agendaItemId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_59e46f6f705d0416740ca93264" ON "oparl_consultations" ("meetingId") `,
    );
    await queryRunner.query(
      `CREATE TABLE "oparl_consultation_organizations" ("ownerId" character varying NOT NULL, "targetOparlId" text NOT NULL, "targetId" character varying, CONSTRAINT "PK_f5883e66ee83fdf05d3eccdad85" PRIMARY KEY ("ownerId", "targetOparlId"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_8743d0bbca0b444bc87acedd22" ON "oparl_consultation_organizations" ("targetId") `,
    );
    await queryRunner.query(
      `CREATE TABLE "oparl_bodies" ("id" character varying NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "systemId" character varying NOT NULL, "oparlId" text NOT NULL, "web" text, "oparlCreated" TIMESTAMP WITH TIME ZONE, "oparlModified" TIMESTAMP WITH TIME ZONE, "raw" jsonb NOT NULL, "fromListing" boolean NOT NULL DEFAULT false, "name" text, "shortName" text, "website" text, "ags" text, "rgs" text, "classification" text, "locationOparlId" text, "locationId" character varying, CONSTRAINT "UQ_2646878c728b0238ec5e402d97b" UNIQUE ("systemId", "oparlId"), CONSTRAINT "PK_e64f6e3fafbdd69d289df440032" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_9d4ada21d0b365226c45f5844e" ON "oparl_bodies" ("locationId") `,
    );
    await queryRunner.query(
      `CREATE TABLE "oparl_agenda_item_auxiliary_files" ("ownerId" character varying NOT NULL, "targetOparlId" text NOT NULL, "targetId" character varying, CONSTRAINT "PK_423701c572b8ef143c2707910f9" PRIMARY KEY ("ownerId", "targetOparlId"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_2b03eb4d716dc1458af629a80d" ON "oparl_agenda_item_auxiliary_files" ("targetId") `,
    );
    await queryRunner.query(
      `ALTER TABLE "oparl_sync_runs" ADD CONSTRAINT "FK_b52a4af61126a7135f5d61a0b22" FOREIGN KEY ("systemId") REFERENCES "oparl_systems"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "oparl_sync_listed_objects" ADD CONSTRAINT "FK_c9158e75c72e0ab63a830cd9937" FOREIGN KEY ("runId") REFERENCES "oparl_sync_runs"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "oparl_persons" ADD CONSTRAINT "FK_3f37e7fcc999ae1f0ab3f394138" FOREIGN KEY ("systemId") REFERENCES "oparl_systems"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "oparl_persons" ADD CONSTRAINT "FK_42dc7032cc977875a7927587b25" FOREIGN KEY ("bodyId") REFERENCES "oparl_bodies"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "oparl_files" ADD CONSTRAINT "FK_f94ce720848a01ab4f57bb13561" FOREIGN KEY ("systemId") REFERENCES "oparl_systems"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "oparl_files" ADD CONSTRAINT "FK_f0967c3b0cdb04024c625b22e0d" FOREIGN KEY ("bodyId") REFERENCES "oparl_bodies"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "oparl_files" ADD CONSTRAINT "FK_dbf94310d35ad1f3efc1210b37f" FOREIGN KEY ("masterFileId") REFERENCES "oparl_files"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "oparl_papers" ADD CONSTRAINT "FK_bed3f3e1bbd2de67a0a7b08d426" FOREIGN KEY ("systemId") REFERENCES "oparl_systems"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "oparl_papers" ADD CONSTRAINT "FK_55da59ad5280f46be4f0b085511" FOREIGN KEY ("bodyId") REFERENCES "oparl_bodies"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "oparl_papers" ADD CONSTRAINT "FK_944b99055dbd41a9aedcfb7b1ae" FOREIGN KEY ("mainFileId") REFERENCES "oparl_files"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "oparl_locations" ADD CONSTRAINT "FK_71c0e92c7cdc5a99a74e3ed89a5" FOREIGN KEY ("systemId") REFERENCES "oparl_systems"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "oparl_locations" ADD CONSTRAINT "FK_dcec9c3a77ea9182d160c399e6f" FOREIGN KEY ("bodyId") REFERENCES "oparl_bodies"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "oparl_organizations" ADD CONSTRAINT "FK_e69efbddb98811da0c7331b3b4c" FOREIGN KEY ("systemId") REFERENCES "oparl_systems"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "oparl_organizations" ADD CONSTRAINT "FK_11e3fa71fd50ef6b65c52582649" FOREIGN KEY ("bodyId") REFERENCES "oparl_bodies"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "oparl_organizations" ADD CONSTRAINT "FK_7ad8086be20f3a28b8bd9157534" FOREIGN KEY ("subOrganizationOfId") REFERENCES "oparl_organizations"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "oparl_organizations" ADD CONSTRAINT "FK_626dbcd112619752ba2b826c850" FOREIGN KEY ("locationId") REFERENCES "oparl_locations"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "oparl_paper_under_direction_of" ADD CONSTRAINT "FK_d6a285d4ae77bf90a7efd4d0e91" FOREIGN KEY ("ownerId") REFERENCES "oparl_papers"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "oparl_paper_under_direction_of" ADD CONSTRAINT "FK_020b70b418b3fbd170191830745" FOREIGN KEY ("targetId") REFERENCES "oparl_organizations"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "oparl_paper_superordinated_papers" ADD CONSTRAINT "FK_51e35692b43207fa44fe34600ef" FOREIGN KEY ("ownerId") REFERENCES "oparl_papers"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "oparl_paper_superordinated_papers" ADD CONSTRAINT "FK_026a273e0df247c19b4e2b82acf" FOREIGN KEY ("targetId") REFERENCES "oparl_papers"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "oparl_paper_subordinated_papers" ADD CONSTRAINT "FK_e32a44edf456ddd5cba067e501f" FOREIGN KEY ("ownerId") REFERENCES "oparl_papers"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "oparl_paper_subordinated_papers" ADD CONSTRAINT "FK_9147592788de995b6a03b7b1576" FOREIGN KEY ("targetId") REFERENCES "oparl_papers"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "oparl_paper_related_papers" ADD CONSTRAINT "FK_2aa93a3ac299f6910dc00b6379a" FOREIGN KEY ("ownerId") REFERENCES "oparl_papers"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "oparl_paper_related_papers" ADD CONSTRAINT "FK_ea531f9ba2faf3fcf1d8b0fb204" FOREIGN KEY ("targetId") REFERENCES "oparl_papers"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "oparl_paper_originator_persons" ADD CONSTRAINT "FK_aa3d9513e6d339dcf74e5ec639f" FOREIGN KEY ("ownerId") REFERENCES "oparl_papers"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "oparl_paper_originator_persons" ADD CONSTRAINT "FK_db7cf0d24b1330194d2b3e058c1" FOREIGN KEY ("targetId") REFERENCES "oparl_persons"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "oparl_paper_originator_organizations" ADD CONSTRAINT "FK_2f3b371bf1c34ea8ce88506f2d5" FOREIGN KEY ("ownerId") REFERENCES "oparl_papers"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "oparl_paper_originator_organizations" ADD CONSTRAINT "FK_080c2d34e4f39f05b93bf8affb9" FOREIGN KEY ("targetId") REFERENCES "oparl_organizations"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "oparl_paper_locations" ADD CONSTRAINT "FK_28975ea834e4948dbb2b14b2340" FOREIGN KEY ("ownerId") REFERENCES "oparl_papers"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "oparl_paper_locations" ADD CONSTRAINT "FK_a9142616f3c38eca9e4916af9e4" FOREIGN KEY ("targetId") REFERENCES "oparl_locations"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "oparl_paper_auxiliary_files" ADD CONSTRAINT "FK_75f80a2b08f1571041307cb1bb6" FOREIGN KEY ("ownerId") REFERENCES "oparl_papers"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "oparl_paper_auxiliary_files" ADD CONSTRAINT "FK_8b90e5fb6defca67eef9cfd64a9" FOREIGN KEY ("targetId") REFERENCES "oparl_files"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "oparl_memberships" ADD CONSTRAINT "FK_e6f8358d788de8945cc7a95b811" FOREIGN KEY ("systemId") REFERENCES "oparl_systems"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "oparl_memberships" ADD CONSTRAINT "FK_fd51bbf735811fdc72c1ab8dcbd" FOREIGN KEY ("bodyId") REFERENCES "oparl_bodies"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "oparl_memberships" ADD CONSTRAINT "FK_893403d87a78a144c9cb20a768d" FOREIGN KEY ("personId") REFERENCES "oparl_persons"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "oparl_memberships" ADD CONSTRAINT "FK_86ae7b780cac4964101744a7ab6" FOREIGN KEY ("organizationId") REFERENCES "oparl_organizations"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "oparl_memberships" ADD CONSTRAINT "FK_2a621de7b649ee5378a34a11568" FOREIGN KEY ("onBehalfOfId") REFERENCES "oparl_organizations"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "oparl_meetings" ADD CONSTRAINT "FK_6913e31bfbbfc2899864d807ced" FOREIGN KEY ("systemId") REFERENCES "oparl_systems"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "oparl_meetings" ADD CONSTRAINT "FK_eed4963358997e73250949b2577" FOREIGN KEY ("bodyId") REFERENCES "oparl_bodies"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "oparl_meetings" ADD CONSTRAINT "FK_0a6f0399593c2d5add31c55936a" FOREIGN KEY ("locationId") REFERENCES "oparl_locations"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "oparl_meetings" ADD CONSTRAINT "FK_8c5a6b986068c3c34e34222a4a8" FOREIGN KEY ("invitationId") REFERENCES "oparl_files"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "oparl_meetings" ADD CONSTRAINT "FK_bf2db31409ff9703caee782d2e2" FOREIGN KEY ("resultsProtocolId") REFERENCES "oparl_files"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "oparl_meetings" ADD CONSTRAINT "FK_044540a61c908e4e0894f4158f9" FOREIGN KEY ("verbatimProtocolId") REFERENCES "oparl_files"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "oparl_meeting_participants" ADD CONSTRAINT "FK_7817e914d0ec38d0891160bb89a" FOREIGN KEY ("ownerId") REFERENCES "oparl_meetings"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "oparl_meeting_participants" ADD CONSTRAINT "FK_3c04ff0d55fe27f032587c89b89" FOREIGN KEY ("targetId") REFERENCES "oparl_persons"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "oparl_meeting_organizations" ADD CONSTRAINT "FK_2e4b6cd58d787df2adec931149f" FOREIGN KEY ("ownerId") REFERENCES "oparl_meetings"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "oparl_meeting_organizations" ADD CONSTRAINT "FK_dc686dce3305f296958c308afba" FOREIGN KEY ("targetId") REFERENCES "oparl_organizations"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "oparl_meeting_auxiliary_files" ADD CONSTRAINT "FK_e96734f7fda8c282ede30170934" FOREIGN KEY ("ownerId") REFERENCES "oparl_meetings"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "oparl_meeting_auxiliary_files" ADD CONSTRAINT "FK_693d0be9c148d758fef280b7195" FOREIGN KEY ("targetId") REFERENCES "oparl_files"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "oparl_legislative_terms" ADD CONSTRAINT "FK_1a557053c2c4d49077c6a6e031a" FOREIGN KEY ("systemId") REFERENCES "oparl_systems"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "oparl_legislative_terms" ADD CONSTRAINT "FK_4acc2a21f3d0925c907ddf9a73d" FOREIGN KEY ("bodyId") REFERENCES "oparl_bodies"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "oparl_agenda_items" ADD CONSTRAINT "FK_21493109877c3cd0d6bdc569d9d" FOREIGN KEY ("systemId") REFERENCES "oparl_systems"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "oparl_agenda_items" ADD CONSTRAINT "FK_15e82ae6aee6bc58e683181734b" FOREIGN KEY ("bodyId") REFERENCES "oparl_bodies"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "oparl_agenda_items" ADD CONSTRAINT "FK_80a6a8f1ff9ba1267fdcc33c780" FOREIGN KEY ("meetingId") REFERENCES "oparl_meetings"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "oparl_agenda_items" ADD CONSTRAINT "FK_6901826eb49fd5473411c58d311" FOREIGN KEY ("consultationId") REFERENCES "oparl_consultations"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "oparl_agenda_items" ADD CONSTRAINT "FK_a2159420a7261f6d1d9421d5af2" FOREIGN KEY ("resolutionFileId") REFERENCES "oparl_files"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "oparl_consultations" ADD CONSTRAINT "FK_c385250b56e08eb73b207b20ca8" FOREIGN KEY ("systemId") REFERENCES "oparl_systems"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "oparl_consultations" ADD CONSTRAINT "FK_2ce23a706b67f3de15c8839f6ad" FOREIGN KEY ("bodyId") REFERENCES "oparl_bodies"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "oparl_consultations" ADD CONSTRAINT "FK_9e306cc21cd670c4e832c7c9f95" FOREIGN KEY ("paperId") REFERENCES "oparl_papers"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "oparl_consultations" ADD CONSTRAINT "FK_334ca58ce668c55b931b071c899" FOREIGN KEY ("agendaItemId") REFERENCES "oparl_agenda_items"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "oparl_consultations" ADD CONSTRAINT "FK_59e46f6f705d0416740ca932640" FOREIGN KEY ("meetingId") REFERENCES "oparl_meetings"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "oparl_consultation_organizations" ADD CONSTRAINT "FK_748b0112b3085bc0b1d56d47b0f" FOREIGN KEY ("ownerId") REFERENCES "oparl_consultations"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "oparl_consultation_organizations" ADD CONSTRAINT "FK_8743d0bbca0b444bc87acedd227" FOREIGN KEY ("targetId") REFERENCES "oparl_organizations"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "oparl_bodies" ADD CONSTRAINT "FK_f508fb7dc951b77ca52c4865bdd" FOREIGN KEY ("systemId") REFERENCES "oparl_systems"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "oparl_bodies" ADD CONSTRAINT "FK_9d4ada21d0b365226c45f5844e4" FOREIGN KEY ("locationId") REFERENCES "oparl_locations"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "oparl_agenda_item_auxiliary_files" ADD CONSTRAINT "FK_74acc8831d22138a5794945d5e3" FOREIGN KEY ("ownerId") REFERENCES "oparl_agenda_items"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "oparl_agenda_item_auxiliary_files" ADD CONSTRAINT "FK_2b03eb4d716dc1458af629a80da" FOREIGN KEY ("targetId") REFERENCES "oparl_files"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "oparl_agenda_item_auxiliary_files" DROP CONSTRAINT "FK_2b03eb4d716dc1458af629a80da"`,
    );
    await queryRunner.query(
      `ALTER TABLE "oparl_agenda_item_auxiliary_files" DROP CONSTRAINT "FK_74acc8831d22138a5794945d5e3"`,
    );
    await queryRunner.query(
      `ALTER TABLE "oparl_bodies" DROP CONSTRAINT "FK_9d4ada21d0b365226c45f5844e4"`,
    );
    await queryRunner.query(
      `ALTER TABLE "oparl_bodies" DROP CONSTRAINT "FK_f508fb7dc951b77ca52c4865bdd"`,
    );
    await queryRunner.query(
      `ALTER TABLE "oparl_consultation_organizations" DROP CONSTRAINT "FK_8743d0bbca0b444bc87acedd227"`,
    );
    await queryRunner.query(
      `ALTER TABLE "oparl_consultation_organizations" DROP CONSTRAINT "FK_748b0112b3085bc0b1d56d47b0f"`,
    );
    await queryRunner.query(
      `ALTER TABLE "oparl_consultations" DROP CONSTRAINT "FK_59e46f6f705d0416740ca932640"`,
    );
    await queryRunner.query(
      `ALTER TABLE "oparl_consultations" DROP CONSTRAINT "FK_334ca58ce668c55b931b071c899"`,
    );
    await queryRunner.query(
      `ALTER TABLE "oparl_consultations" DROP CONSTRAINT "FK_9e306cc21cd670c4e832c7c9f95"`,
    );
    await queryRunner.query(
      `ALTER TABLE "oparl_consultations" DROP CONSTRAINT "FK_2ce23a706b67f3de15c8839f6ad"`,
    );
    await queryRunner.query(
      `ALTER TABLE "oparl_consultations" DROP CONSTRAINT "FK_c385250b56e08eb73b207b20ca8"`,
    );
    await queryRunner.query(
      `ALTER TABLE "oparl_agenda_items" DROP CONSTRAINT "FK_a2159420a7261f6d1d9421d5af2"`,
    );
    await queryRunner.query(
      `ALTER TABLE "oparl_agenda_items" DROP CONSTRAINT "FK_6901826eb49fd5473411c58d311"`,
    );
    await queryRunner.query(
      `ALTER TABLE "oparl_agenda_items" DROP CONSTRAINT "FK_80a6a8f1ff9ba1267fdcc33c780"`,
    );
    await queryRunner.query(
      `ALTER TABLE "oparl_agenda_items" DROP CONSTRAINT "FK_15e82ae6aee6bc58e683181734b"`,
    );
    await queryRunner.query(
      `ALTER TABLE "oparl_agenda_items" DROP CONSTRAINT "FK_21493109877c3cd0d6bdc569d9d"`,
    );
    await queryRunner.query(
      `ALTER TABLE "oparl_legislative_terms" DROP CONSTRAINT "FK_4acc2a21f3d0925c907ddf9a73d"`,
    );
    await queryRunner.query(
      `ALTER TABLE "oparl_legislative_terms" DROP CONSTRAINT "FK_1a557053c2c4d49077c6a6e031a"`,
    );
    await queryRunner.query(
      `ALTER TABLE "oparl_meeting_auxiliary_files" DROP CONSTRAINT "FK_693d0be9c148d758fef280b7195"`,
    );
    await queryRunner.query(
      `ALTER TABLE "oparl_meeting_auxiliary_files" DROP CONSTRAINT "FK_e96734f7fda8c282ede30170934"`,
    );
    await queryRunner.query(
      `ALTER TABLE "oparl_meeting_organizations" DROP CONSTRAINT "FK_dc686dce3305f296958c308afba"`,
    );
    await queryRunner.query(
      `ALTER TABLE "oparl_meeting_organizations" DROP CONSTRAINT "FK_2e4b6cd58d787df2adec931149f"`,
    );
    await queryRunner.query(
      `ALTER TABLE "oparl_meeting_participants" DROP CONSTRAINT "FK_3c04ff0d55fe27f032587c89b89"`,
    );
    await queryRunner.query(
      `ALTER TABLE "oparl_meeting_participants" DROP CONSTRAINT "FK_7817e914d0ec38d0891160bb89a"`,
    );
    await queryRunner.query(
      `ALTER TABLE "oparl_meetings" DROP CONSTRAINT "FK_044540a61c908e4e0894f4158f9"`,
    );
    await queryRunner.query(
      `ALTER TABLE "oparl_meetings" DROP CONSTRAINT "FK_bf2db31409ff9703caee782d2e2"`,
    );
    await queryRunner.query(
      `ALTER TABLE "oparl_meetings" DROP CONSTRAINT "FK_8c5a6b986068c3c34e34222a4a8"`,
    );
    await queryRunner.query(
      `ALTER TABLE "oparl_meetings" DROP CONSTRAINT "FK_0a6f0399593c2d5add31c55936a"`,
    );
    await queryRunner.query(
      `ALTER TABLE "oparl_meetings" DROP CONSTRAINT "FK_eed4963358997e73250949b2577"`,
    );
    await queryRunner.query(
      `ALTER TABLE "oparl_meetings" DROP CONSTRAINT "FK_6913e31bfbbfc2899864d807ced"`,
    );
    await queryRunner.query(
      `ALTER TABLE "oparl_memberships" DROP CONSTRAINT "FK_2a621de7b649ee5378a34a11568"`,
    );
    await queryRunner.query(
      `ALTER TABLE "oparl_memberships" DROP CONSTRAINT "FK_86ae7b780cac4964101744a7ab6"`,
    );
    await queryRunner.query(
      `ALTER TABLE "oparl_memberships" DROP CONSTRAINT "FK_893403d87a78a144c9cb20a768d"`,
    );
    await queryRunner.query(
      `ALTER TABLE "oparl_memberships" DROP CONSTRAINT "FK_fd51bbf735811fdc72c1ab8dcbd"`,
    );
    await queryRunner.query(
      `ALTER TABLE "oparl_memberships" DROP CONSTRAINT "FK_e6f8358d788de8945cc7a95b811"`,
    );
    await queryRunner.query(
      `ALTER TABLE "oparl_paper_auxiliary_files" DROP CONSTRAINT "FK_8b90e5fb6defca67eef9cfd64a9"`,
    );
    await queryRunner.query(
      `ALTER TABLE "oparl_paper_auxiliary_files" DROP CONSTRAINT "FK_75f80a2b08f1571041307cb1bb6"`,
    );
    await queryRunner.query(
      `ALTER TABLE "oparl_paper_locations" DROP CONSTRAINT "FK_a9142616f3c38eca9e4916af9e4"`,
    );
    await queryRunner.query(
      `ALTER TABLE "oparl_paper_locations" DROP CONSTRAINT "FK_28975ea834e4948dbb2b14b2340"`,
    );
    await queryRunner.query(
      `ALTER TABLE "oparl_paper_originator_organizations" DROP CONSTRAINT "FK_080c2d34e4f39f05b93bf8affb9"`,
    );
    await queryRunner.query(
      `ALTER TABLE "oparl_paper_originator_organizations" DROP CONSTRAINT "FK_2f3b371bf1c34ea8ce88506f2d5"`,
    );
    await queryRunner.query(
      `ALTER TABLE "oparl_paper_originator_persons" DROP CONSTRAINT "FK_db7cf0d24b1330194d2b3e058c1"`,
    );
    await queryRunner.query(
      `ALTER TABLE "oparl_paper_originator_persons" DROP CONSTRAINT "FK_aa3d9513e6d339dcf74e5ec639f"`,
    );
    await queryRunner.query(
      `ALTER TABLE "oparl_paper_related_papers" DROP CONSTRAINT "FK_ea531f9ba2faf3fcf1d8b0fb204"`,
    );
    await queryRunner.query(
      `ALTER TABLE "oparl_paper_related_papers" DROP CONSTRAINT "FK_2aa93a3ac299f6910dc00b6379a"`,
    );
    await queryRunner.query(
      `ALTER TABLE "oparl_paper_subordinated_papers" DROP CONSTRAINT "FK_9147592788de995b6a03b7b1576"`,
    );
    await queryRunner.query(
      `ALTER TABLE "oparl_paper_subordinated_papers" DROP CONSTRAINT "FK_e32a44edf456ddd5cba067e501f"`,
    );
    await queryRunner.query(
      `ALTER TABLE "oparl_paper_superordinated_papers" DROP CONSTRAINT "FK_026a273e0df247c19b4e2b82acf"`,
    );
    await queryRunner.query(
      `ALTER TABLE "oparl_paper_superordinated_papers" DROP CONSTRAINT "FK_51e35692b43207fa44fe34600ef"`,
    );
    await queryRunner.query(
      `ALTER TABLE "oparl_paper_under_direction_of" DROP CONSTRAINT "FK_020b70b418b3fbd170191830745"`,
    );
    await queryRunner.query(
      `ALTER TABLE "oparl_paper_under_direction_of" DROP CONSTRAINT "FK_d6a285d4ae77bf90a7efd4d0e91"`,
    );
    await queryRunner.query(
      `ALTER TABLE "oparl_organizations" DROP CONSTRAINT "FK_626dbcd112619752ba2b826c850"`,
    );
    await queryRunner.query(
      `ALTER TABLE "oparl_organizations" DROP CONSTRAINT "FK_7ad8086be20f3a28b8bd9157534"`,
    );
    await queryRunner.query(
      `ALTER TABLE "oparl_organizations" DROP CONSTRAINT "FK_11e3fa71fd50ef6b65c52582649"`,
    );
    await queryRunner.query(
      `ALTER TABLE "oparl_organizations" DROP CONSTRAINT "FK_e69efbddb98811da0c7331b3b4c"`,
    );
    await queryRunner.query(
      `ALTER TABLE "oparl_locations" DROP CONSTRAINT "FK_dcec9c3a77ea9182d160c399e6f"`,
    );
    await queryRunner.query(
      `ALTER TABLE "oparl_locations" DROP CONSTRAINT "FK_71c0e92c7cdc5a99a74e3ed89a5"`,
    );
    await queryRunner.query(
      `ALTER TABLE "oparl_papers" DROP CONSTRAINT "FK_944b99055dbd41a9aedcfb7b1ae"`,
    );
    await queryRunner.query(
      `ALTER TABLE "oparl_papers" DROP CONSTRAINT "FK_55da59ad5280f46be4f0b085511"`,
    );
    await queryRunner.query(
      `ALTER TABLE "oparl_papers" DROP CONSTRAINT "FK_bed3f3e1bbd2de67a0a7b08d426"`,
    );
    await queryRunner.query(
      `ALTER TABLE "oparl_files" DROP CONSTRAINT "FK_dbf94310d35ad1f3efc1210b37f"`,
    );
    await queryRunner.query(
      `ALTER TABLE "oparl_files" DROP CONSTRAINT "FK_f0967c3b0cdb04024c625b22e0d"`,
    );
    await queryRunner.query(
      `ALTER TABLE "oparl_files" DROP CONSTRAINT "FK_f94ce720848a01ab4f57bb13561"`,
    );
    await queryRunner.query(
      `ALTER TABLE "oparl_persons" DROP CONSTRAINT "FK_42dc7032cc977875a7927587b25"`,
    );
    await queryRunner.query(
      `ALTER TABLE "oparl_persons" DROP CONSTRAINT "FK_3f37e7fcc999ae1f0ab3f394138"`,
    );
    await queryRunner.query(
      `ALTER TABLE "oparl_sync_listed_objects" DROP CONSTRAINT "FK_c9158e75c72e0ab63a830cd9937"`,
    );
    await queryRunner.query(
      `ALTER TABLE "oparl_sync_runs" DROP CONSTRAINT "FK_b52a4af61126a7135f5d61a0b22"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_2b03eb4d716dc1458af629a80d"`,
    );
    await queryRunner.query(`DROP TABLE "oparl_agenda_item_auxiliary_files"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_9d4ada21d0b365226c45f5844e"`,
    );
    await queryRunner.query(`DROP TABLE "oparl_bodies"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_8743d0bbca0b444bc87acedd22"`,
    );
    await queryRunner.query(`DROP TABLE "oparl_consultation_organizations"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_59e46f6f705d0416740ca93264"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_334ca58ce668c55b931b071c89"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_9e306cc21cd670c4e832c7c9f9"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_2ce23a706b67f3de15c8839f6a"`,
    );
    await queryRunner.query(`DROP TABLE "oparl_consultations"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_a2159420a7261f6d1d9421d5af"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_6901826eb49fd5473411c58d31"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_80a6a8f1ff9ba1267fdcc33c78"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_15e82ae6aee6bc58e683181734"`,
    );
    await queryRunner.query(`DROP TABLE "oparl_agenda_items"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_4acc2a21f3d0925c907ddf9a73"`,
    );
    await queryRunner.query(`DROP TABLE "oparl_legislative_terms"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_693d0be9c148d758fef280b719"`,
    );
    await queryRunner.query(`DROP TABLE "oparl_meeting_auxiliary_files"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_dc686dce3305f296958c308afb"`,
    );
    await queryRunner.query(`DROP TABLE "oparl_meeting_organizations"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_3c04ff0d55fe27f032587c89b8"`,
    );
    await queryRunner.query(`DROP TABLE "oparl_meeting_participants"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_c52af2ba2b639357aba39b092e"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_044540a61c908e4e0894f4158f"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_bf2db31409ff9703caee782d2e"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_8c5a6b986068c3c34e34222a4a"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_0a6f0399593c2d5add31c55936"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_eed4963358997e73250949b257"`,
    );
    await queryRunner.query(`DROP TABLE "oparl_meetings"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_2a621de7b649ee5378a34a1156"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_86ae7b780cac4964101744a7ab"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_893403d87a78a144c9cb20a768"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_fd51bbf735811fdc72c1ab8dcb"`,
    );
    await queryRunner.query(`DROP TABLE "oparl_memberships"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_8b90e5fb6defca67eef9cfd64a"`,
    );
    await queryRunner.query(`DROP TABLE "oparl_paper_auxiliary_files"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_a9142616f3c38eca9e4916af9e"`,
    );
    await queryRunner.query(`DROP TABLE "oparl_paper_locations"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_080c2d34e4f39f05b93bf8affb"`,
    );
    await queryRunner.query(
      `DROP TABLE "oparl_paper_originator_organizations"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_db7cf0d24b1330194d2b3e058c"`,
    );
    await queryRunner.query(`DROP TABLE "oparl_paper_originator_persons"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_ea531f9ba2faf3fcf1d8b0fb20"`,
    );
    await queryRunner.query(`DROP TABLE "oparl_paper_related_papers"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_9147592788de995b6a03b7b157"`,
    );
    await queryRunner.query(`DROP TABLE "oparl_paper_subordinated_papers"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_026a273e0df247c19b4e2b82ac"`,
    );
    await queryRunner.query(`DROP TABLE "oparl_paper_superordinated_papers"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_020b70b418b3fbd17019183074"`,
    );
    await queryRunner.query(`DROP TABLE "oparl_paper_under_direction_of"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_626dbcd112619752ba2b826c85"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_7ad8086be20f3a28b8bd915753"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_11e3fa71fd50ef6b65c5258264"`,
    );
    await queryRunner.query(`DROP TABLE "oparl_organizations"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_dcec9c3a77ea9182d160c399e6"`,
    );
    await queryRunner.query(`DROP TABLE "oparl_locations"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_4dbb39ad91ececf77c80a2966f"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_944b99055dbd41a9aedcfb7b1a"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_55da59ad5280f46be4f0b08551"`,
    );
    await queryRunner.query(`DROP TABLE "oparl_papers"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_dbf94310d35ad1f3efc1210b37"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_f0967c3b0cdb04024c625b22e0"`,
    );
    await queryRunner.query(`DROP TABLE "oparl_files"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_42dc7032cc977875a7927587b2"`,
    );
    await queryRunner.query(`DROP TABLE "oparl_persons"`);
    await queryRunner.query(`DROP TABLE "oparl_sync_listed_objects"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_ea16dd0aaeb7a8c51bdae515c9"`,
    );
    await queryRunner.query(`DROP TABLE "oparl_sync_runs"`);
    await queryRunner.query(`DROP TYPE "public"."oparl_sync_runs_status_enum"`);
    await queryRunner.query(`DROP TYPE "public"."oparl_sync_runs_kind_enum"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_2e2632b4337f957db1a10ba613"`,
    );
    await queryRunner.query(`DROP TABLE "oparl_systems"`);
    await queryRunner.query(
      `DROP TYPE "public"."oparl_systems_lastrunstatus_enum"`,
    );
  }
}
