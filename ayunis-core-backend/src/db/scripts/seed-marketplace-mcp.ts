/**
 * Local-only helper: seed a marketplace-style MCP integration that has a
 * required, per-user auth header (a userField with a headerName). This is the
 * shape the custom-integration form cannot express, and it is what triggers the
 * per-user authorization flow (MarketplaceMcpIntegration.requiresUserAuthorization).
 *
 * Run with:
 *   pnpm exec ts-node -r tsconfig-paths/register src/db/scripts/seed-marketplace-mcp.ts
 *
 * Idempotent: skips any org that already has this integration (unique on
 * orgId + marketplaceIdentifier). Not wired into pnpm seed — it's a throwaway
 * for testing this branch.
 */
import 'src/config/env';
import { randomUUID } from 'crypto';
import type { UUID } from 'crypto';
import dataSource from 'src/db/datasource';
import { OrgRecord } from 'src/iam/orgs/infrastructure/repositories/local/schema/org.record';
import { MarketplaceMcpIntegrationRecord } from 'src/domain/mcp/infrastructure/persistence/postgres/schema/marketplace-mcp-integration.record';
import { NoAuthMcpIntegrationAuthRecord } from 'src/domain/mcp/infrastructure/persistence/postgres/schema/no-auth-mcp-integration-auth.record';
import type { IntegrationConfigSchema } from 'src/domain/mcp/domain/value-objects/integration-config-schema';

const MARKETPLACE_IDENTIFIER = 'local-test-user-auth';

const configSchema: IntegrationConfigSchema = {
  authType: 'bearer_token',
  orgFields: [],
  userFields: [
    {
      key: 'api_key',
      label: 'API Key',
      type: 'secret',
      headerName: 'Authorization',
      prefix: 'Bearer ',
      required: true,
      help: 'Your personal token. Sent as the Authorization: Bearer header.',
    },
  ],
};

async function run(): Promise<void> {
  await dataSource.initialize();
  try {
    const orgRepo = dataSource.getRepository(OrgRecord);
    const intRepo = dataSource.getRepository(MarketplaceMcpIntegrationRecord);
    const authRepo = dataSource.getRepository(NoAuthMcpIntegrationAuthRecord);
    const orgs = await orgRepo.find();

    for (const org of orgs) {
      const existing = await intRepo.findOne({
        where: {
          orgId: org.id as UUID,
          marketplaceIdentifier: MARKETPLACE_IDENTIFIER,
        },
      });
      if (existing) {
        console.log(`⏭️  Exists: ${org.name}`); // eslint-disable-line no-console
        continue;
      }

      const integrationId = randomUUID();

      const record = new MarketplaceMcpIntegrationRecord();
      record.id = integrationId;
      record.orgId = org.id as UUID;
      record.name = 'Local Test (User Auth)';
      record.serverUrl = 'https://staging-api.speechmind.com/mcp/';
      record.enabled = true;
      record.connectionStatus = 'pending';
      record.returnsPii = false;
      record.description =
        'Seeded marketplace integration with a required per-user auth header.';
      record.marketplaceIdentifier = MARKETPLACE_IDENTIFIER;
      record.configSchema = configSchema;
      record.orgConfigValues = {};
      record.logoUrl = null;

      // Insert the integration first (FK target), then its NoAuth auth row.
      await intRepo.save(record);

      const auth = new NoAuthMcpIntegrationAuthRecord();
      auth.id = randomUUID();
      auth.integrationId = integrationId;
      await authRepo.save(auth);

      console.log(`✅ Created for: ${org.name}`); // eslint-disable-line no-console
    }
  } finally {
    await dataSource.destroy();
  }
}

void run();
