import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
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
import { CreateDiagramToolHandler } from './handlers/create-diagram-tool.handler';
import { CreateDiagramTool } from '../domain/tools/create-diagram-tool.entity';
import { UpdateDiagramToolHandler } from './handlers/update-diagram-tool.handler';
import { UpdateDiagramTool } from '../domain/tools/update-diagram-tool.entity';
import { CreateSpreadsheetToolHandler } from './handlers/create-spreadsheet-tool.handler';
import { CreateSpreadsheetTool } from '../domain/tools/create-spreadsheet-tool.entity';
import { UpdateSpreadsheetToolHandler } from './handlers/update-spreadsheet-tool.handler';
import { UpdateSpreadsheetTool } from '../domain/tools/update-spreadsheet-tool.entity';
import { CreateEmailToolHandler } from './handlers/create-email-tool.handler';
import { CreateEmailTool } from '../domain/tools/create-email-tool.entity';
import { UpdateEmailToolHandler } from './handlers/update-email-tool.handler';
import { UpdateEmailTool } from '../domain/tools/update-email-tool.entity';
import { ReadEmailToolHandler } from './handlers/read-email-tool.handler';
import { ReadEmailTool } from '../domain/tools/read-email-tool.entity';

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- constructor types vary; used only as Map keys for instanceof matching
type ToolConstructor = abstract new (...args: any[]) => Tool;

@Injectable()
export class ToolHandlerRegistry {
  private readonly handlers: [ToolConstructor, ToolExecutionHandler][];

  // eslint-disable-next-line max-lines-per-function -- NestJS DI keeps the tool-to-handler wiring explicit
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
    createEmailToolHandler: CreateEmailToolHandler,
    updateEmailToolHandler: UpdateEmailToolHandler,
    readEmailToolHandler: ReadEmailToolHandler,
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
    ];
    this.addStructuredArtifactHandlers(
      createSpreadsheetToolHandler,
      updateSpreadsheetToolHandler,
      createEmailToolHandler,
      updateEmailToolHandler,
      readEmailToolHandler,
    );
  }

  private addStructuredArtifactHandlers(
    createSpreadsheetToolHandler: CreateSpreadsheetToolHandler,
    updateSpreadsheetToolHandler: UpdateSpreadsheetToolHandler,
    createEmailToolHandler: CreateEmailToolHandler,
    updateEmailToolHandler: UpdateEmailToolHandler,
    readEmailToolHandler: ReadEmailToolHandler,
  ): void {
    this.handlers.push(
      [CreateSpreadsheetTool, createSpreadsheetToolHandler],
      [UpdateSpreadsheetTool, updateSpreadsheetToolHandler],
      [CreateEmailTool, createEmailToolHandler],
      [UpdateEmailTool, updateEmailToolHandler],
      [ReadEmailTool, readEmailToolHandler],
    );
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
