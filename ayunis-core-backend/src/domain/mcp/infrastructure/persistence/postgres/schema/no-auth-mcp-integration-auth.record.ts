import { ChildEntity } from 'typeorm';
import { McpIntegrationAuthRecord } from './mcp-integration-auth.record';

@ChildEntity('NO_AUTH')
export class NoAuthMcpIntegrationAuthRecord extends McpIntegrationAuthRecord {}
