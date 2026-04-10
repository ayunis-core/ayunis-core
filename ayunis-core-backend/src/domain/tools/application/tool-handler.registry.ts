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
import { ActivateSkillToolHandler } from './handlers/activate-skill-tool.handler';
import { ActivateSkillTool } from '../domain/tools/activate-skill-tool.entity';
import { KnowledgeQueryToolHandler } from './handlers/knowledge-query-tool.handler';
import { KnowledgeQueryTool } from '../domain/tools/knowledge-query-tool.entity';
import { KnowledgeGetTextToolHandler } from './handlers/knowledge-get-text-tool.handler';
import { KnowledgeGetTextTool } from '../domain/tools/knowledge-get-text-tool.entity';
import { CreateDocumentToolHandler } from './handlers/create-document-tool.handler';
import { CreateDocumentTool } from '../domain/tools/create-document-tool.entity';
import { UpdateDocumentToolHandler } from './handlers/update-document-tool.handler';
import { UpdateDocumentTool } from '../domain/tools/update-document-tool.entity';
import { EditDocumentToolHandler } from './handlers/edit-document-tool.handler';
import { EditDocumentTool } from '../domain/tools/edit-document-tool.entity';
import { ReadDocumentToolHandler } from './handlers/read-document-tool.handler';
import { ReadDocumentTool } from '../domain/tools/read-document-tool.entity';
import { GenerateImageToolHandler } from './handlers/generate-image-tool.handler';
import { GenerateImageTool } from '../domain/tools/generate-image-tool.entity';

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- constructor types vary; used only as Map keys for instanceof matching
type ToolConstructor = abstract new (...args: any[]) => Tool;

@Injectable()
export class ToolHandlerRegistry {
  private readonly logger = new Logger(ToolHandlerRegistry.name);
  private readonly handlers: [ToolConstructor, ToolExecutionHandler][];

  constructor(
    httpToolHandler: HttpToolHandler,
    sourceQueryToolHandler: SourceQueryToolHandler,
    sourceGetTextToolHandler: SourceGetTextToolHandler,
    internetSearchToolHandler: InternetSearchToolHandler,
    websiteContentToolHandler: WebsiteContentToolHandler,
    codeExecutionToolHandler: CodeExecutionToolHandler,
    mcpIntegrationToolHandler: McpIntegrationToolHandler,
    mcpIntegrationResourceHandler: McpIntegrationResourceHandler,
    activateSkillToolHandler: ActivateSkillToolHandler,
    knowledgeQueryToolHandler: KnowledgeQueryToolHandler,
    knowledgeGetTextToolHandler: KnowledgeGetTextToolHandler,
    createDocumentToolHandler: CreateDocumentToolHandler,
    updateDocumentToolHandler: UpdateDocumentToolHandler,
    editDocumentToolHandler: EditDocumentToolHandler,
    readDocumentToolHandler: ReadDocumentToolHandler,
    generateImageToolHandler: GenerateImageToolHandler,
  ) {
    this.handlers = [
      [HttpTool, httpToolHandler],
      [SourceQueryTool, sourceQueryToolHandler],
      [SourceGetTextTool, sourceGetTextToolHandler],
      [InternetSearchTool, internetSearchToolHandler],
      [WebsiteContentTool, websiteContentToolHandler],
      [CodeExecutionTool, codeExecutionToolHandler],
      [McpIntegrationTool, mcpIntegrationToolHandler],
      [McpIntegrationResource, mcpIntegrationResourceHandler],
      [ActivateSkillTool, activateSkillToolHandler],
      [KnowledgeQueryTool, knowledgeQueryToolHandler],
      [KnowledgeGetTextTool, knowledgeGetTextToolHandler],
      [CreateDocumentTool, createDocumentToolHandler],
      [UpdateDocumentTool, updateDocumentToolHandler],
      [EditDocumentTool, editDocumentToolHandler],
      [ReadDocumentTool, readDocumentToolHandler],
      [GenerateImageTool, generateImageToolHandler],
    ];
  }

  getHandler(tool: Tool): ToolExecutionHandler {
    this.logger.log(`Getting handler for tool: ${tool.name}`);

    const entry = this.handlers.find(([ctor]) => tool instanceof ctor);
    if (entry) {
      return entry[1];
    }

    throw new ToolHandlerNotFoundError({ toolType: tool.name });
  }
}
