import { ChildEntity, Column } from 'typeorm';
import { McpIntegrationRecord } from './mcp-integration.record';
import { McpIntegrationKind } from '../../../../domain/value-objects/mcp-integration-kind.enum';
import { IntegrationConfigSchema } from '../../../../domain/value-objects/integration-config-schema';

@ChildEntity(McpIntegrationKind.MARKETPLACE)
export class MarketplaceMcpIntegrationRecord extends McpIntegrationRecord {
  @Column({ name: 'marketplace_identifier' })
  marketplaceIdentifier: string;

  @Column({ name: 'config_schema', type: 'jsonb' })
  configSchema: IntegrationConfigSchema;

  @Column({ name: 'org_config_values', type: 'jsonb', default: '{}' })
  orgConfigValues: Record<string, string>;
}
