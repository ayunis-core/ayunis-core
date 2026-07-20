import { ChildEntity } from 'typeorm';
import { McpIntegrationAuthRecord } from './mcp-integration-auth.record';
import { McpAuthMethod } from 'src/domain/mcp/domain';

@ChildEntity(McpAuthMethod.NO_AUTH)
export class NoAuthMcpIntegrationAuthRecord extends McpIntegrationAuthRecord {}
