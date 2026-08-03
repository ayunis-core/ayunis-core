import type { MigrationInterface, QueryRunner } from 'typeorm';
import {
  buildLegacyCustomConfig,
  restoreLegacyCustomAuth,
} from '../migration-utils/legacy-custom-mcp-integration-backfill';
import type {
  LegacyCustomAuth,
  SchemaConfiguredCustomAuth,
} from '../migration-utils/legacy-custom-mcp-integration-backfill';

interface LegacyCustomRow extends Omit<LegacyCustomAuth, 'authType'> {
  integrationId: string;
  authId: string | null;
  authType: string | null;
}

interface SchemaConfiguredCustomRow {
  integrationId: string;
  authId: string | null;
  configSchema: SchemaConfiguredCustomAuth['configSchema'];
  orgConfigValues: SchemaConfiguredCustomAuth['orgConfigValues'];
}

export class BackfillLegacyCustomMcpIntegrations1785752072933 implements MigrationInterface {
  name = 'BackfillLegacyCustomMcpIntegrations1785752072933';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const rows = await selectLegacyCustomRows(queryRunner);
    const backfills = rows.map((row) => ({
      row,
      config: buildLegacyCustomConfig({
        authType: row.authType ?? '',
        authToken: row.authToken,
        secret: row.secret,
        headerName: row.headerName,
      }),
    }));

    for (const backfill of backfills) {
      await storeSchemaConfig(queryRunner, backfill.row, backfill.config);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const rows = await selectSchemaConfiguredCustomRows(queryRunner);
    const restorations = rows.map((row) => ({
      row,
      auth: restoreLegacyCustomAuth(row.configSchema, row.orgConfigValues),
    }));

    for (const restoration of restorations) {
      await restoreLegacyAuth(queryRunner, restoration.row, restoration.auth);
    }
  }
}

async function selectLegacyCustomRows(
  queryRunner: QueryRunner,
): Promise<LegacyCustomRow[]> {
  return (await queryRunner.query(`
    SELECT
      integration."id" AS "integrationId",
      auth."id" AS "authId",
      auth."auth_type" AS "authType",
      auth."authToken" AS "authToken",
      auth."secret" AS "secret",
      auth."headerName" AS "headerName"
    FROM "mcp_integrations" integration
    LEFT JOIN "mcp_integration_auth_methods" auth
      ON auth."integrationId" = integration."id"
    WHERE integration."integration_type" = 'custom'
      AND integration."config_schema" IS NULL
    FOR UPDATE OF integration
  `)) as LegacyCustomRow[];
}

async function storeSchemaConfig(
  queryRunner: QueryRunner,
  row: LegacyCustomRow,
  config: SchemaConfiguredCustomAuth,
): Promise<void> {
  if (!row.authId) {
    throw new Error(
      `Cannot backfill custom MCP integration ${row.integrationId} without an auth row`,
    );
  }
  await queryRunner.query(
    `UPDATE "mcp_integrations"
     SET "config_schema" = $1::jsonb, "org_config_values" = $2::jsonb
     WHERE "id" = $3`,
    [
      JSON.stringify(config.configSchema),
      JSON.stringify(config.orgConfigValues),
      row.integrationId,
    ],
  );
  await queryRunner.query(
    `UPDATE "mcp_integration_auth_methods"
     SET "auth_type" = 'NO_AUTH', "authToken" = NULL,
         "secret" = NULL, "headerName" = NULL
     WHERE "id" = $1`,
    [row.authId],
  );
}

async function selectSchemaConfiguredCustomRows(
  queryRunner: QueryRunner,
): Promise<SchemaConfiguredCustomRow[]> {
  return (await queryRunner.query(`
    SELECT
      integration."id" AS "integrationId",
      auth."id" AS "authId",
      integration."config_schema" AS "configSchema",
      COALESCE(integration."org_config_values", '{}'::jsonb) AS "orgConfigValues"
    FROM "mcp_integrations" integration
    LEFT JOIN "mcp_integration_auth_methods" auth
      ON auth."integrationId" = integration."id"
    WHERE integration."integration_type" = 'custom'
      AND integration."config_schema" IS NOT NULL
    FOR UPDATE OF integration
  `)) as SchemaConfiguredCustomRow[];
}

async function restoreLegacyAuth(
  queryRunner: QueryRunner,
  row: SchemaConfiguredCustomRow,
  auth: LegacyCustomAuth,
): Promise<void> {
  if (!row.authId) {
    throw new Error(
      `Cannot restore custom MCP integration ${row.integrationId} without an auth row`,
    );
  }
  await queryRunner.query(
    `UPDATE "mcp_integration_auth_methods"
     SET "auth_type" = $1, "authToken" = $2,
         "secret" = $3, "headerName" = $4
     WHERE "id" = $5`,
    [auth.authType, auth.authToken, auth.secret, auth.headerName, row.authId],
  );
  await queryRunner.query(
    `UPDATE "mcp_integrations"
     SET "config_schema" = NULL, "org_config_values" = '{}'::jsonb
     WHERE "id" = $1`,
    [row.integrationId],
  );
}
