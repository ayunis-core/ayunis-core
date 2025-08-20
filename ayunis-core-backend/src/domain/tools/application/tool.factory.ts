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
import {
  ToolInvalidConfigError,
  ToolInvalidContextError,
  ToolInvalidTypeError,
} from './tools.errors';
import { Source } from 'src/domain/sources/domain/source.entity';
import { SendEmailTool } from '../domain/tools/send-email-tool.entity';

@Injectable()
export class ToolFactory {
  createTool(params: {
    type: ToolType;
    config?: ToolConfig;
    context?: unknown;
  }): Tool {
    switch (params.type) {
      case ToolType.HTTP:
        if (params.config && params.config instanceof HttpToolConfig) {
          return new HttpTool(params.config);
        }
        throw new ToolInvalidConfigError({
          toolName: 'HTTP',
          metadata: {
            configType: params.config?.constructor.name || 'null',
          },
        });
      case ToolType.INTERNET_SEARCH:
        return new InternetSearchTool();
      case ToolType.WEBSITE_CONTENT:
        return new WebsiteContentTool();
      case ToolType.SOURCE_QUERY:
        if (
          params.context &&
          params.context instanceof Array &&
          params.context.every((source: unknown) => source instanceof Source)
        ) {
          return new SourceQueryTool(params.context);
        }
        throw new ToolInvalidContextError({
          toolType: params.type,
          metadata: {
            contextType: params.context?.constructor.name || 'null',
          },
        });
      case ToolType.SEND_EMAIL:
        return new SendEmailTool();
      default:
        throw new ToolInvalidTypeError({
          toolType: params.type,
        });
    }
  }

  supportedToolTypes(): string[] {
    return Object.values(ToolType);
  }
}
