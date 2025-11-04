import { ChildEntity, Column } from 'typeorm';
import { McpIntegrationAuthRecord } from './mcp-integration-auth.record';

@ChildEntity('BEARER_TOKEN')
export class BearerMcpIntegrationAuthRecord extends McpIntegrationAuthRecord {
  @Column({ name: 'auth_token', type: 'text', nullable: true })
  authToken?: string;
}
