import type { Provider, Type } from '@nestjs/common';
import type {
  ToolConstructor,
  ToolHandlerEntry,
} from './tool-handler.registry';
import { TOOL_HANDLER_ENTRIES } from './tool-handler.registry';
import type { ToolExecutionHandler } from './ports/execution.handler';
import { HttpToolHandler } from './handlers/http-tool.handler';
import { HttpTool } from '../domain/tools/http-tool.entity';
import { SourceQueryToolHandler } from './handlers/source-query-tool.handler';
import { SourceQueryTool } from '../domain/tools/source-query-tool.entity';
import { SourceGetTextToolHandler } from './handlers/source-get-text-tool.handler';
import { SourceGetTextTool } from '../domain/tools/source-get-text-tool.entity';
import { InternetSearchToolHandler } from './handlers/internet-search-tool.handler';
import { InternetSearchTool } from '../domain/tools/internet-search-tool.entity';
import { WebsiteContentToolHandler } from './handlers/website-content-tool.handler';
import { WebsiteContentTool } from '../domain/tools/website-content-tool.entity';
import { CodeExecutionToolHandler } from './handlers/code-execution-tool.handler';
import { CodeExecutionTool } from '../domain/tools/code-execution-tool.entity';
import { McpIntegrationToolHandler } from './handlers/mcp-integration-tool.handler';
import { McpIntegrationTool } from '../domain/tools/mcp-integration-tool.entity';
import { McpIntegrationResourceHandler } from './handlers/mcp-integration-resource.handler';
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
import { CreateJsxToolHandler } from './handlers/create-jsx-tool.handler';
import { CreateJsxTool } from '../domain/tools/create-jsx-tool.entity';
import { UpdateJsxToolHandler } from './handlers/update-jsx-tool.handler';
import { UpdateJsxTool } from '../domain/tools/update-jsx-tool.entity';

/**
 * Single source of truth for tool ↔ handler pairs.
 *
 * Each entry is a `[ToolConstructor, HandlerConstructor]` tuple. The Nest
 * provider below derives its `inject` array and factory output from this
 * list, so adding or reordering a pair cannot desync the two halves.
 */
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
  [CreateDocumentTool, CreateDocumentToolHandler],
  [UpdateDocumentTool, UpdateDocumentToolHandler],
  [EditDocumentTool, EditDocumentToolHandler],
  [ReadDocumentTool, ReadDocumentToolHandler],
  [GenerateImageTool, GenerateImageToolHandler],
  [CreateDiagramTool, CreateDiagramToolHandler],
  [UpdateDiagramTool, UpdateDiagramToolHandler],
  [CreateJsxTool, CreateJsxToolHandler],
  [UpdateJsxTool, UpdateJsxToolHandler],
] as const;

export const TOOL_HANDLER_PROVIDERS: Provider[] = TOOL_HANDLER_PAIRS.map(
  ([, handler]) => handler,
);

export const TOOL_HANDLER_ENTRIES_PROVIDER: Provider = {
  provide: TOOL_HANDLER_ENTRIES,
  useFactory: (...handlers: ToolExecutionHandler[]): ToolHandlerEntry[] =>
    TOOL_HANDLER_PAIRS.map(
      ([ctor], i): ToolHandlerEntry => [ctor, handlers[i]],
    ),
  inject: TOOL_HANDLER_PAIRS.map(([, handler]) => handler),
};
