import { ChildEntity } from 'typeorm';
import { McpIntegrationRecord } from './mcp-integration.record';

@ChildEntity('CUSTOM')
export class CustomMcpIntegrationRecord extends McpIntegrationRecord {}
