import { ChildEntity, Column, Unique } from 'typeorm';
import { McpIntegrationRecord } from './mcp-integration.record';
import { PredefinedMcpIntegrationSlug } from '../../../../domain/value-objects/predefined-mcp-integration-slug.enum';

@ChildEntity('PREDEFINED')
@Unique(['orgId', 'predefinedSlug'])
export class PredefinedMcpIntegrationRecord extends McpIntegrationRecord {
  @Column({ name: 'predefined_slug', enum: PredefinedMcpIntegrationSlug })
  predefinedSlug: PredefinedMcpIntegrationSlug;
}
