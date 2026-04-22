import { Injectable } from '@nestjs/common';
import { Tool } from 'src/domain/tools/domain/tool.entity';
import { ToolConfig } from 'src/domain/tools/domain/tool-config.entity';
import { ToolType } from 'src/domain/tools/domain/value-objects/tool-type.enum';
import {
  HttpToolConfig,
  HttpTool,
} from 'src/domain/tools/domain/tools/http-tool.entity';
import { InternetSearchTool } from '../domain/tools/internet-search-tool.entity';
import { WebsiteContentTool } from '../domain/tools/website-content-tool.entity';
import { SourceQueryTool } from '../domain/tools/source-query-tool.entity';
import { SourceGetTextTool } from '../domain/tools/source-get-text-tool.entity';
import { ToolInvalidConfigError, ToolInvalidTypeError } from './tools.errors';
import {
  requireArrayContext,
  requireKnowledgeBaseContext,
  requireMapContext,
  requireStringArrayContext,
} from './tool-context.validators';
import { Source } from 'src/domain/sources/domain/source.entity';
import { SendEmailTool } from '../domain/tools/send-email-tool.entity';
import { CreateCalendarEventTool } from '../domain/tools/create-calendar-event-tool.entity';
import { CodeExecutionTool } from '../domain/tools/code-execution-tool.entity';
import { BarChartTool } from '../domain/tools/bar-chart-tool.entity';
import { LineChartTool } from '../domain/tools/line-chart-tool.entity';
import { PieChartTool } from '../domain/tools/pie-chart-tool.entity';
import { DataSource } from 'src/domain/sources/domain/sources/data-source.entity';
import { ActivateSkillTool } from '../domain/tools/activate-skill-tool.entity';
import { CreateSkillTool } from '../domain/tools/create-skill-tool.entity';
import { EditSkillTool } from '../domain/tools/edit-skill-tool.entity';
import { KnowledgeQueryTool } from '../domain/tools/knowledge-query-tool.entity';
import { KnowledgeGetTextTool } from '../domain/tools/knowledge-get-text-tool.entity';
import { CreateDocumentTool } from '../domain/tools/create-document-tool.entity';
import { UpdateDocumentTool } from '../domain/tools/update-document-tool.entity';
import { EditDocumentTool } from '../domain/tools/edit-document-tool.entity';
import { ReadDocumentTool } from '../domain/tools/read-document-tool.entity';
import { GenerateImageTool } from '../domain/tools/generate-image-tool.entity';
import { CreateDiagramTool } from '../domain/tools/create-diagram-tool.entity';
import { UpdateDiagramTool } from '../domain/tools/update-diagram-tool.entity';
import { CreateJsxTool } from '../domain/tools/create-jsx-tool.entity';
import { UpdateJsxTool } from '../domain/tools/update-jsx-tool.entity';

type ToolCreator = (params: { config?: ToolConfig; context?: unknown }) => Tool;

const SIMPLE_TOOLS: Record<string, () => Tool> = {
  [ToolType.INTERNET_SEARCH]: () => new InternetSearchTool(),
  [ToolType.WEBSITE_CONTENT]: () => new WebsiteContentTool(),
  [ToolType.SEND_EMAIL]: () => new SendEmailTool(),
  [ToolType.CREATE_CALENDAR_EVENT]: () => new CreateCalendarEventTool(),
  [ToolType.BAR_CHART]: () => new BarChartTool(),
  [ToolType.LINE_CHART]: () => new LineChartTool(),
  [ToolType.PIE_CHART]: () => new PieChartTool(),
  [ToolType.CREATE_SKILL]: () => new CreateSkillTool(),
  [ToolType.CREATE_DOCUMENT]: () => new CreateDocumentTool(),
  [ToolType.UPDATE_DOCUMENT]: () => new UpdateDocumentTool(),
  [ToolType.EDIT_DOCUMENT]: () => new EditDocumentTool(),
  [ToolType.READ_DOCUMENT]: () => new ReadDocumentTool(),
  [ToolType.GENERATE_IMAGE]: () => new GenerateImageTool(),
  [ToolType.CREATE_DIAGRAM]: () => new CreateDiagramTool(),
  [ToolType.UPDATE_DIAGRAM]: () => new UpdateDiagramTool(),
  [ToolType.CREATE_JSX]: () => new CreateJsxTool(),
  [ToolType.UPDATE_JSX]: () => new UpdateJsxTool(),
};

@Injectable()
export class ToolFactory {
  private readonly creators: Record<string, ToolCreator>;

  constructor() {
    this.creators = {
      ...SIMPLE_TOOLS,
      [ToolType.HTTP]: (p) => this.createHttpTool(p.config),
      [ToolType.SOURCE_QUERY]: (p) =>
        new SourceQueryTool(
          requireArrayContext(p.context, Source, ToolType.SOURCE_QUERY),
        ),
      [ToolType.SOURCE_GET_TEXT]: (p) =>
        new SourceGetTextTool(
          requireArrayContext(p.context, Source, ToolType.SOURCE_GET_TEXT),
        ),
      [ToolType.CODE_EXECUTION]: (p) =>
        new CodeExecutionTool(
          requireArrayContext(p.context, DataSource, ToolType.CODE_EXECUTION),
        ),
      [ToolType.ACTIVATE_SKILL]: (p) =>
        new ActivateSkillTool(
          requireMapContext(p.context, ToolType.ACTIVATE_SKILL),
        ),
      [ToolType.EDIT_SKILL]: (p) =>
        new EditSkillTool(
          requireStringArrayContext(p.context, ToolType.EDIT_SKILL),
        ),
      [ToolType.KNOWLEDGE_QUERY]: (p) =>
        new KnowledgeQueryTool(
          requireKnowledgeBaseContext(p.context, ToolType.KNOWLEDGE_QUERY),
        ),
      [ToolType.KNOWLEDGE_GET_TEXT]: (p) =>
        new KnowledgeGetTextTool(
          requireKnowledgeBaseContext(p.context, ToolType.KNOWLEDGE_GET_TEXT),
        ),
    };
  }

  createTool(params: {
    type: ToolType;
    config?: ToolConfig;
    context?: unknown;
  }): Tool {
    const creator = this.creators[params.type];
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- runtime guard: noUncheckedIndexedAccess is not enabled
    if (!creator) {
      throw new ToolInvalidTypeError({ toolType: params.type });
    }
    return creator(params);
  }

  supportedToolTypes(): string[] {
    return Object.values(ToolType);
  }

  private createHttpTool(config?: ToolConfig): HttpTool {
    if (config instanceof HttpToolConfig) {
      return new HttpTool(config);
    }
    throw new ToolInvalidConfigError({
      toolName: 'HTTP',
      metadata: {
        configType: config?.constructor.name ?? 'null',
      },
    });
  }
}
