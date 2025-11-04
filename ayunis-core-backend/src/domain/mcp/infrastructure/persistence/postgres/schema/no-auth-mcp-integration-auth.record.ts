import { ChildEntity } from 'typeorm';
import { McpIntegrationAuthRecord } from './mcp-integration-auth.record';
import { McpAuthMethod } from '../../../../domain';

@ChildEntity(McpAuthMethod.NO_AUTH)
export class NoAuthMcpIntegrationAuthRecord extends McpIntegrationAuthRecord {}
