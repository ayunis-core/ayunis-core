import { ChildEntity, Column } from 'typeorm';
import { McpIntegrationRecord } from './mcp-integration.record';
import { PredefinedMcpIntegrationSlug } from 'src/domain/mcp/domain/value-objects/predefined-mcp-integration-slug.enum';

@ChildEntity('PREDEFINED')
export class PredefinedMcpIntegrationRecord extends McpIntegrationRecord {
  @Column({ name: 'predefined_slug', enum: PredefinedMcpIntegrationSlug })
  predefinedSlug: PredefinedMcpIntegrationSlug;
}
