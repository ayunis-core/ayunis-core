import type { Provider, Type } from '@nestjs/common';
import {
  TOOL_HANDLER_ENTRIES,
  type ToolConstructor,
  type ToolHandlerEntry,
} from './tool-handler.registry';
import type { ToolExecutionHandler } from './ports/execution.handler';
import { HttpToolHandler } from './handlers/http-tool.handler';
import { SourceQueryToolHandler } from './handlers/source-query-tool.handler';
import { SourceGetTextToolHandler } from './handlers/source-get-text-tool.handler';
import { InternetSearchToolHandler } from './handlers/internet-search-tool.handler';
import { WebsiteContentToolHandler } from './handlers/website-content-tool.handler';
import { CodeExecutionToolHandler } from './handlers/code-execution-tool.handler';
import { McpIntegrationToolHandler } from './handlers/mcp-integration-tool.handler';
import { McpIntegrationResourceHandler } from './handlers/mcp-integration-resource.handler';
import { ActivateSkillToolHandler } from './handlers/activate-skill-tool.handler';
import { KnowledgeQueryToolHandler } from './handlers/knowledge-query-tool.handler';
import { KnowledgeGetTextToolHandler } from './handlers/knowledge-get-text-tool.handler';
import { RecordingSearchToolHandler } from './handlers/recording-search-tool.handler';
import { CreateDocumentToolHandler } from './handlers/create-document-tool.handler';
import { UpdateDocumentToolHandler } from './handlers/update-document-tool.handler';
import { EditDocumentToolHandler } from './handlers/edit-document-tool.handler';
import { ReadDocumentToolHandler } from './handlers/read-document-tool.handler';
import { GenerateImageToolHandler } from './handlers/generate-image-tool.handler';
import { CreateDiagramToolHandler } from './handlers/create-diagram-tool.handler';
import { UpdateDiagramToolHandler } from './handlers/update-diagram-tool.handler';
import { ReadDiagramToolHandler } from 'src/domain/tools/application/handlers/read-diagram-tool.handler';
import { CreateSpreadsheetToolHandler } from './handlers/create-spreadsheet-tool.handler';
import { UpdateSpreadsheetToolHandler } from './handlers/update-spreadsheet-tool.handler';
import { ReadSpreadsheetToolHandler } from 'src/domain/tools/application/handlers/read-spreadsheet-tool.handler';
import { MarketplaceSearchToolHandler } from './handlers/marketplace-search-tool.handler';
import { SendNotificationToolHandler } from './handlers/send-notification-tool.handler';
import { AddAnonymizationExceptionToolHandler } from './handlers/add-anonymization-exception-tool.handler';
import { GetMemoryToolHandler } from './handlers/get-memory-tool.handler';
import { SetMemoryToolHandler } from './handlers/set-memory-tool.handler';
import { ChatListToolHandler } from './handlers/chat-list-tool.handler';
import { ChatReadToolHandler } from './handlers/chat-read-tool.handler';
import { ChatGrepToolHandler } from './handlers/chat-grep-tool.handler';
import { HttpTool } from 'src/domain/tools/domain/tools/http-tool.entity';
import { SourceQueryTool } from 'src/domain/tools/domain/tools/source-query-tool.entity';
import { SourceGetTextTool } from 'src/domain/tools/domain/tools/source-get-text-tool.entity';
import { InternetSearchTool } from 'src/domain/tools/domain/tools/internet-search-tool.entity';
import { WebsiteContentTool } from 'src/domain/tools/domain/tools/website-content-tool.entity';
import { CodeExecutionTool } from 'src/domain/tools/domain/tools/code-execution-tool.entity';
import { McpIntegrationTool } from 'src/domain/tools/domain/tools/mcp-integration-tool.entity';
import { McpIntegrationResource } from 'src/domain/tools/domain/tools/mcp-integration-resource.entity';
import { ActivateSkillTool } from 'src/domain/tools/domain/tools/activate-skill-tool.entity';
import { KnowledgeQueryTool } from 'src/domain/tools/domain/tools/knowledge-query-tool.entity';
import { KnowledgeGetTextTool } from 'src/domain/tools/domain/tools/knowledge-get-text-tool.entity';
import { RecordingSearchTool } from 'src/domain/tools/domain/tools/recording-search-tool.entity';
import { CreateDocumentTool } from 'src/domain/tools/domain/tools/create-document-tool.entity';
import { UpdateDocumentTool } from 'src/domain/tools/domain/tools/update-document-tool.entity';
import { EditDocumentTool } from 'src/domain/tools/domain/tools/edit-document-tool.entity';
import { ReadDocumentTool } from 'src/domain/tools/domain/tools/read-document-tool.entity';
import { GenerateImageTool } from 'src/domain/tools/domain/tools/generate-image-tool.entity';
import { CreateDiagramTool } from 'src/domain/tools/domain/tools/create-diagram-tool.entity';
import { UpdateDiagramTool } from 'src/domain/tools/domain/tools/update-diagram-tool.entity';
import { ReadDiagramTool } from 'src/domain/tools/domain/tools/read-diagram-tool.entity';
import { CreateSpreadsheetTool } from 'src/domain/tools/domain/tools/create-spreadsheet-tool.entity';
import { UpdateSpreadsheetTool } from 'src/domain/tools/domain/tools/update-spreadsheet-tool.entity';
import { ReadSpreadsheetTool } from 'src/domain/tools/domain/tools/read-spreadsheet-tool.entity';
import { MarketplaceSearchTool } from 'src/domain/tools/domain/tools/marketplace-search-tool.entity';
import { SendNotificationTool } from 'src/domain/tools/domain/tools/send-notification-tool.entity';
import { AddAnonymizationExceptionTool } from 'src/domain/tools/domain/tools/add-anonymization-exception-tool.entity';
import { GetMemoryTool } from 'src/domain/tools/domain/tools/get-memory-tool.entity';
import { SetMemoryTool } from 'src/domain/tools/domain/tools/set-memory-tool.entity';
import { ChatListTool } from 'src/domain/tools/domain/tools/chat-list-tool.entity';
import { ChatReadTool } from 'src/domain/tools/domain/tools/chat-read-tool.entity';
import { ChatGrepTool } from 'src/domain/tools/domain/tools/chat-grep-tool.entity';

// The registry matches with instanceof and takes the first hit, so a subclass
// must be listed before its parent class.
const TOOL_HANDLER_PAIRS: readonly (readonly [
  ToolConstructor,
  Type<ToolExecutionHandler>,
])[] = [
  [HttpTool, HttpToolHandler],
  [SourceQueryTool, SourceQueryToolHandler],
  [SourceGetTextTool, SourceGetTextToolHandler],
  [InternetSearchTool, InternetSearchToolHandler],
  [WebsiteContentTool, WebsiteContentToolHandler],
  [CodeExecutionTool, CodeExecutionToolHandler],
  [McpIntegrationTool, McpIntegrationToolHandler],
  [McpIntegrationResource, McpIntegrationResourceHandler],
  [ActivateSkillTool, ActivateSkillToolHandler],
  [KnowledgeQueryTool, KnowledgeQueryToolHandler],
  [KnowledgeGetTextTool, KnowledgeGetTextToolHandler],
  [RecordingSearchTool, RecordingSearchToolHandler],
  [CreateDocumentTool, CreateDocumentToolHandler],
  [UpdateDocumentTool, UpdateDocumentToolHandler],
  [EditDocumentTool, EditDocumentToolHandler],
  [ReadDocumentTool, ReadDocumentToolHandler],
  [GenerateImageTool, GenerateImageToolHandler],
  [CreateDiagramTool, CreateDiagramToolHandler],
  [UpdateDiagramTool, UpdateDiagramToolHandler],
  [ReadDiagramTool, ReadDiagramToolHandler],
  [CreateSpreadsheetTool, CreateSpreadsheetToolHandler],
  [UpdateSpreadsheetTool, UpdateSpreadsheetToolHandler],
  [ReadSpreadsheetTool, ReadSpreadsheetToolHandler],
  [MarketplaceSearchTool, MarketplaceSearchToolHandler],
  [SendNotificationTool, SendNotificationToolHandler],
  [AddAnonymizationExceptionTool, AddAnonymizationExceptionToolHandler],
  [GetMemoryTool, GetMemoryToolHandler],
  [SetMemoryTool, SetMemoryToolHandler],
  [ChatListTool, ChatListToolHandler],
  [ChatReadTool, ChatReadToolHandler],
  [ChatGrepTool, ChatGrepToolHandler],
];

export const TOOL_HANDLER_PROVIDERS: Provider[] = TOOL_HANDLER_PAIRS.map(
  ([, handler]) => handler,
);

export const TOOL_HANDLER_ENTRIES_PROVIDER: Provider = {
  provide: TOOL_HANDLER_ENTRIES,
  useFactory: (...handlers: ToolExecutionHandler[]): ToolHandlerEntry[] =>
    TOOL_HANDLER_PAIRS.map(([tool], i) => [tool, handlers[i]]),
  inject: TOOL_HANDLER_PAIRS.map(([, handler]) => handler),
};
