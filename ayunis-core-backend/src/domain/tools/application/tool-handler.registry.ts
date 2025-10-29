import { Injectable, Logger } from '@nestjs/common';
import { Tool } from '../domain/tool.entity';
import { ToolExecutionHandler } from './ports/execution.handler';
import { ToolHandlerNotFoundError } from './tools.errors';
import { HttpToolHandler } from './handlers/http-tool.handler';
import { SourceQueryToolHandler } from './handlers/source-query-tool.handler';
import { HttpTool } from '../domain/tools/http-tool.entity';
import { SourceQueryTool } from '../domain/tools/source-query-tool.entity';
import { InternetSearchToolHandler } from './handlers/internet-search-tool.handler';
import { InternetSearchTool } from '../domain/tools/internet-search-tool.entity';
import { WebsiteContentToolHandler } from './handlers/website-content-tool.handler';
import { WebsiteContentTool } from '../domain/tools/website-content-tool.entity';
import { CodeExecutionToolHandler } from './handlers/code-execution-tool.handler';
import { CodeExecutionTool } from '../domain/tools/code-execution-tool.entity';
import { McpIntegrationToolHandler } from './handlers/mcp-integration-tool.handler';
import { McpIntegrationResourceHandler } from './handlers/mcp-integration-resource.handler';
import { McpIntegrationTool } from '../domain/tools/mcp-integration-tool.entity';
import { McpIntegrationResource } from '../domain/tools/mcp-integration-resource.entity';

@Injectable()
export class ToolHandlerRegistry {
  private readonly logger = new Logger(ToolHandlerRegistry.name);

  constructor(
    private readonly httpToolHandler: HttpToolHandler,
    private readonly sourceQueryToolHandler: SourceQueryToolHandler,
    private readonly internetSearchToolHandler: InternetSearchToolHandler,
    private readonly websiteContentToolHandler: WebsiteContentToolHandler,
    private readonly codeExecutionToolHandler: CodeExecutionToolHandler,
    private readonly mcpIntegrationToolHandler: McpIntegrationToolHandler,
    private readonly mcpIntegrationResourceHandler: McpIntegrationResourceHandler,
  ) {}

  getHandler(tool: Tool): ToolExecutionHandler {
    this.logger.log(`Getting handler for tool: ${tool.name}`);
    if (tool instanceof HttpTool) {
      return this.httpToolHandler;
    }
    if (tool instanceof SourceQueryTool) {
      return this.sourceQueryToolHandler;
    }
    if (tool instanceof InternetSearchTool) {
      return this.internetSearchToolHandler;
    }
    if (tool instanceof WebsiteContentTool) {
      return this.websiteContentToolHandler;
    }
    if (tool instanceof CodeExecutionTool) {
      return this.codeExecutionToolHandler;
    }
    if (tool instanceof McpIntegrationTool) {
      return this.mcpIntegrationToolHandler;
    }
    if (tool instanceof McpIntegrationResource) {
      return this.mcpIntegrationResourceHandler;
    }
    throw new ToolHandlerNotFoundError({
      toolType: tool.name,
    });
  }
}
