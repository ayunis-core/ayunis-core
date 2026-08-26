import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { Tool } from 'src/domain/tools/domain/tool.entity';
import { ToolExecutionHandler } from './ports/execution.handler';
import { ToolHandlerNotFoundError } from './tools.errors';
import { HttpToolHandler } from './handlers/http-tool.handler';
import { SourceQueryToolHandler } from './handlers/source-query-tool.handler';
import { SourceGetTextToolHandler } from './handlers/source-get-text-tool.handler';
import { HttpTool } from 'src/domain/tools/domain/tools/http-tool.entity';
import { SourceQueryTool } from 'src/domain/tools/domain/tools/source-query-tool.entity';
import { SourceGetTextTool } from 'src/domain/tools/domain/tools/source-get-text-tool.entity';
import { InternetSearchToolHandler } from './handlers/internet-search-tool.handler';
import { InternetSearchTool } from 'src/domain/tools/domain/tools/internet-search-tool.entity';
import { WebsiteContentToolHandler } from './handlers/website-content-tool.handler';
import { WebsiteContentTool } from 'src/domain/tools/domain/tools/website-content-tool.entity';
import { CodeExecutionToolHandler } from './handlers/code-execution-tool.handler';
import { CodeExecutionTool } from 'src/domain/tools/domain/tools/code-execution-tool.entity';
import { McpIntegrationToolHandler } from './handlers/mcp-integration-tool.handler';
import { McpIntegrationResourceHandler } from './handlers/mcp-integration-resource.handler';
import { McpIntegrationTool } from 'src/domain/tools/domain/tools/mcp-integration-tool.entity';
import { McpIntegrationResource } from 'src/domain/tools/domain/tools/mcp-integration-resource.entity';
import { ActivateSkillToolHandler } from './handlers/activate-skill-tool.handler';
import { ActivateSkillTool } from 'src/domain/tools/domain/tools/activate-skill-tool.entity';
import { KnowledgeQueryToolHandler } from './handlers/knowledge-query-tool.handler';
import { KnowledgeQueryTool } from 'src/domain/tools/domain/tools/knowledge-query-tool.entity';
import { KnowledgeGetTextToolHandler } from './handlers/knowledge-get-text-tool.handler';
import { KnowledgeGetTextTool } from 'src/domain/tools/domain/tools/knowledge-get-text-tool.entity';
import { CreateDocumentToolHandler } from './handlers/create-document-tool.handler';
import { CreateDocumentTool } from 'src/domain/tools/domain/tools/create-document-tool.entity';
import { UpdateDocumentToolHandler } from './handlers/update-document-tool.handler';
import { UpdateDocumentTool } from 'src/domain/tools/domain/tools/update-document-tool.entity';
import { EditDocumentToolHandler } from './handlers/edit-document-tool.handler';
import { EditDocumentTool } from 'src/domain/tools/domain/tools/edit-document-tool.entity';
import { ReadDocumentToolHandler } from './handlers/read-document-tool.handler';
import { ReadDocumentTool } from 'src/domain/tools/domain/tools/read-document-tool.entity';
import { GenerateImageToolHandler } from './handlers/generate-image-tool.handler';
import { GenerateImageTool } from 'src/domain/tools/domain/tools/generate-image-tool.entity';
import { CreateDiagramToolHandler } from './handlers/create-diagram-tool.handler';
import { CreateDiagramTool } from 'src/domain/tools/domain/tools/create-diagram-tool.entity';
import { UpdateDiagramToolHandler } from './handlers/update-diagram-tool.handler';
import { UpdateDiagramTool } from 'src/domain/tools/domain/tools/update-diagram-tool.entity';
import { CreateSpreadsheetToolHandler } from './handlers/create-spreadsheet-tool.handler';
import { CreateSpreadsheetTool } from 'src/domain/tools/domain/tools/create-spreadsheet-tool.entity';
import { UpdateSpreadsheetToolHandler } from './handlers/update-spreadsheet-tool.handler';
import { UpdateSpreadsheetTool } from 'src/domain/tools/domain/tools/update-spreadsheet-tool.entity';
import { LoadToolsToolHandler } from 'src/domain/tools/application/handlers/load-tools-tool.handler';
import { LoadToolsTool } from 'src/domain/tools/domain/tools/load-tools-tool.entity';

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- constructor types vary; used only as Map keys for instanceof matching
type ToolConstructor = abstract new (...args: any[]) => Tool;

@Injectable()
export class ToolHandlerRegistry {
  private readonly handlers: [ToolConstructor, ToolExecutionHandler][];

  constructor(
    @InjectPinoLogger(ToolHandlerRegistry.name)
    private readonly logger: PinoLogger,
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
    createDiagramToolHandler: CreateDiagramToolHandler,
    updateDiagramToolHandler: UpdateDiagramToolHandler,
    createSpreadsheetToolHandler: CreateSpreadsheetToolHandler,
    updateSpreadsheetToolHandler: UpdateSpreadsheetToolHandler,
    loadToolsToolHandler: LoadToolsToolHandler,
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
      [CreateDiagramTool, createDiagramToolHandler],
      [UpdateDiagramTool, updateDiagramToolHandler],
      [CreateSpreadsheetTool, createSpreadsheetToolHandler],
      [UpdateSpreadsheetTool, updateSpreadsheetToolHandler],
      [LoadToolsTool, loadToolsToolHandler],
    ];
  }

  getHandler(tool: Tool): ToolExecutionHandler {
    this.logger.info({ name: tool.name }, 'Getting handler for tool');

    const entry = this.handlers.find(([ctor]) => tool instanceof ctor);
    if (entry) {
      return entry[1];
    }

    throw new ToolHandlerNotFoundError({ toolType: tool.name });
  }
}
