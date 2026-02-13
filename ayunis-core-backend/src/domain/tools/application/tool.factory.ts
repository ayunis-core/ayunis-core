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
import {
  ToolInvalidConfigError,
  ToolInvalidContextError,
  ToolInvalidTypeError,
} from './tools.errors';
import { Source } from 'src/domain/sources/domain/source.entity';
import { SendEmailTool } from '../domain/tools/send-email-tool.entity';
import { CreateCalendarEventTool } from '../domain/tools/create-calendar-event-tool.entity';
import { CodeExecutionTool } from '../domain/tools/code-execution-tool.entity';
import { BarChartTool } from '../domain/tools/bar-chart-tool.entity';
import { LineChartTool } from '../domain/tools/line-chart-tool.entity';
import { PieChartTool } from '../domain/tools/pie-chart-tool.entity';
import { DataSource } from 'src/domain/sources/domain/sources/data-source.entity';
import { ProductKnowledgeTool } from '../domain/tools/product-knowledge-tool.entity';
import { ActivateSkillTool } from '../domain/tools/activate-skill-tool.entity';
import { CreateSkillTool } from '../domain/tools/create-skill-tool.entity';
import { Skill } from 'src/domain/skills/domain/skill.entity';

type ToolCreator = (params: { config?: ToolConfig; context?: unknown }) => Tool;

const SIMPLE_TOOLS: Record<string, () => Tool> = {
  [ToolType.INTERNET_SEARCH]: () => new InternetSearchTool(),
  [ToolType.WEBSITE_CONTENT]: () => new WebsiteContentTool(),
  [ToolType.SEND_EMAIL]: () => new SendEmailTool(),
  [ToolType.CREATE_CALENDAR_EVENT]: () => new CreateCalendarEventTool(),
  [ToolType.BAR_CHART]: () => new BarChartTool(),
  [ToolType.LINE_CHART]: () => new LineChartTool(),
  [ToolType.PIE_CHART]: () => new PieChartTool(),
  [ToolType.PRODUCT_KNOWLEDGE]: () => new ProductKnowledgeTool(),
  [ToolType.CREATE_SKILL]: () => new CreateSkillTool(),
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
          requireArrayContext(p.context, Skill, ToolType.ACTIVATE_SKILL),
        ),
    };
  }

  createTool(params: {
    type: ToolType;
    config?: ToolConfig;
    context?: unknown;
  }): Tool {
    const creator = this.creators[params.type];
    if (!creator) {
      throw new ToolInvalidTypeError({ toolType: params.type });
    }
    return creator(params);
  }

  supportedToolTypes(): string[] {
    return Object.values(ToolType);
  }

  private createHttpTool(config?: ToolConfig): HttpTool {
    if (config && config instanceof HttpToolConfig) {
      return new HttpTool(config);
    }
    throw new ToolInvalidConfigError({
      toolName: 'HTTP',
      metadata: {
        configType: config?.constructor.name || 'null',
      },
    });
  }
}

function requireArrayContext<T>(
  context: unknown,
  itemType: abstract new (...args: unknown[]) => T,
  toolType: ToolType,
): T[] {
  if (
    context &&
    context instanceof Array &&
    context.every((item: unknown) => item instanceof itemType)
  ) {
    return context as T[];
  }
  throw new ToolInvalidContextError({
    toolType,
    metadata: {
      contextType:
        (context as { constructor?: { name?: string } })?.constructor?.name ||
        'null',
    },
  });
}
