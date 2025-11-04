import { ChildEntity } from 'typeorm';
import { McpIntegrationRecord } from './mcp-integration.record';
import { McpIntegrationKind } from '../../../../domain';

@ChildEntity(McpIntegrationKind.CUSTOM)
export class CustomMcpIntegrationRecord extends McpIntegrationRecord {}
