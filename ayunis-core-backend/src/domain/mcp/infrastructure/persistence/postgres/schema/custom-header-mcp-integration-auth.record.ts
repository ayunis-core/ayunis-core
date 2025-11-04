import { ChildEntity, Column } from 'typeorm';
import { McpIntegrationAuthRecord } from './mcp-integration-auth.record';
import { McpAuthMethod } from '../../../../domain';

@ChildEntity(McpAuthMethod.CUSTOM_HEADER)
export class CustomHeaderMcpIntegrationAuthRecord extends McpIntegrationAuthRecord {
  @Column({ type: 'text', nullable: true })
  secret?: string;

  @Column({ default: 'X-API-Key' })
  headerName: string = 'X-API-Key';
}
