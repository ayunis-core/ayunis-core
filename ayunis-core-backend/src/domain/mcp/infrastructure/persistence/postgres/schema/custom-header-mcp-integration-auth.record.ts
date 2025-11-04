import { ChildEntity, Column } from 'typeorm';
import { McpIntegrationAuthRecord } from './mcp-integration-auth.record';

@ChildEntity('CUSTOM_HEADER')
export class CustomHeaderMcpIntegrationAuthRecord extends McpIntegrationAuthRecord {
  @Column({ name: 'secret', type: 'text', nullable: true })
  secret?: string;

  @Column({ name: 'header_name', default: 'X-API-Key' })
  headerName: string;
}
