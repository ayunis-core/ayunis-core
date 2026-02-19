import { Injectable, Logger } from '@nestjs/common';
import { Tool } from '../domain/tool.entity';
import { ToolExecutionHandler } from './ports/execution.handler';
import { ToolHandlerNotFoundError } from './tools.errors';
import { HttpToolHandler } from './handlers/http-tool.handler';
import { SourceQueryToolHandler } from './handlers/source-query-tool.handler';
import { SourceGetTextToolHandler } from './handlers/source-get-text-tool.handler';
import { HttpTool } from '../domain/tools/http-tool.entity';
import { SourceQueryTool } from '../domain/tools/source-query-tool.entity';
import { SourceGetTextTool } from '../domain/tools/source-get-text-tool.entity';
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
import { ProductKnowledgeToolHandler } from './handlers/product-knowledge-tool.handler';
import { ProductKnowledgeTool } from '../domain/tools/product-knowledge-tool.entity';
import { ActivateSkillToolHandler } from './handlers/activate-skill-tool.handler';
import { ActivateSkillTool } from '../domain/tools/activate-skill-tool.entity';
import { CreateDocumentToolHandler } from './handlers/create-document-tool.handler';
import { CreateDocumentTool } from '../domain/tools/create-document-tool.entity';
import { UpdateDocumentToolHandler } from './handlers/update-document-tool.handler';
import { UpdateDocumentTool } from '../domain/tools/update-document-tool.entity';

@Injectable()
export class ToolHandlerRegistry {
  private readonly logger = new Logger(ToolHandlerRegistry.name);

  constructor(
    private readonly httpToolHandler: HttpToolHandler,
    private readonly sourceQueryToolHandler: SourceQueryToolHandler,
    private readonly sourceGetTextToolHandler: SourceGetTextToolHandler,
    private readonly internetSearchToolHandler: InternetSearchToolHandler,
    private readonly websiteContentToolHandler: WebsiteContentToolHandler,
    private readonly codeExecutionToolHandler: CodeExecutionToolHandler,
    private readonly mcpIntegrationToolHandler: McpIntegrationToolHandler,
    private readonly mcpIntegrationResourceHandler: McpIntegrationResourceHandler,
    private readonly productKnowledgeToolHandler: ProductKnowledgeToolHandler,
    private readonly activateSkillToolHandler: ActivateSkillToolHandler,
    private readonly createDocumentToolHandler: CreateDocumentToolHandler,
    private readonly updateDocumentToolHandler: UpdateDocumentToolHandler,
  ) {}

  getHandler(tool: Tool): ToolExecutionHandler {
    this.logger.log(`Getting handler for tool: ${tool.name}`);
    if (tool instanceof HttpTool) {
      return this.httpToolHandler;
    }
    if (tool instanceof SourceQueryTool) {
      return this.sourceQueryToolHandler;
    }
    if (tool instanceof SourceGetTextTool) {
      return this.sourceGetTextToolHandler;
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
    if (tool instanceof ProductKnowledgeTool) {
      return this.productKnowledgeToolHandler;
    }
    if (tool instanceof ActivateSkillTool) {
      return this.activateSkillToolHandler;
    }
    if (tool instanceof CreateDocumentTool) {
      return this.createDocumentToolHandler;
    }
    if (tool instanceof UpdateDocumentTool) {
      return this.updateDocumentToolHandler;
    }
    throw new ToolHandlerNotFoundError({
      toolType: tool.name,
    });
  }
}
