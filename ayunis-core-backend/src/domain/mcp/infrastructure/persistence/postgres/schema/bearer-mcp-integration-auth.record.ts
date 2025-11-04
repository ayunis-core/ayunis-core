import { ChildEntity, Column } from 'typeorm';
import { McpIntegrationAuthRecord } from './mcp-integration-auth.record';
import { McpAuthMethod } from '../../../../domain';

@ChildEntity(McpAuthMethod.BEARER_TOKEN)
export class BearerMcpIntegrationAuthRecord extends McpIntegrationAuthRecord {
  @Column({ type: 'text' })
  authToken: string;
}
