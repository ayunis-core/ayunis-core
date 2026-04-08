import { ChildEntity, Column } from 'typeorm';
import { McpIntegrationRecord } from './mcp-integration.record';
import { McpIntegrationKind } from '../../../../domain/value-objects/mcp-integration-kind.enum';
import { IntegrationConfigSchema } from '../../../../domain/value-objects/integration-config-schema';

@ChildEntity(McpIntegrationKind.SELF_DEFINED)
export class SelfDefinedMcpIntegrationRecord extends McpIntegrationRecord {
  @Column({ name: 'config_schema', type: 'jsonb' })
  configSchema: IntegrationConfigSchema;

  @Column({ name: 'org_config_values', type: 'jsonb', default: '{}' })
  orgConfigValues: Record<string, string>;
}
