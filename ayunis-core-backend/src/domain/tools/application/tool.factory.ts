import { Injectable } from '@nestjs/common';
import { Tool } from 'src/domain/tools/domain/tool.entity';
import { ToolConfig } from 'src/domain/tools/domain/tool-config.entity';
import { ToolType } from 'src/domain/tools/domain/value-objects/tool-type.enum';
import {
  HttpToolConfig,
  HttpTool,
} from 'src/domain/tools/domain/tools/http-tool.entity';
import { SourceQueryTool } from '../domain/tools/source-query-tool.entity';
import { InternetSearchTool } from '../domain/tools/internet-search-tool.entity';
import { WebsiteContentTool } from '../domain/tools/website-content-tool.entity';

@Injectable()
export class ToolFactory {
  createTool(type: ToolType, config?: ToolConfig): Tool {
    switch (type) {
      case ToolType.HTTP:
        if (config && config instanceof HttpToolConfig) {
          return new HttpTool(config);
        }
        throw new Error(
          `Invalid config type for HTTP tool: ${config?.constructor.name || 'null'}`,
        );
      case ToolType.INTERNET_SEARCH:
        return new InternetSearchTool();
      case ToolType.SOURCE_QUERY:
        return new SourceQueryTool();
      case ToolType.WEBSITE_CONTENT:
        return new WebsiteContentTool();
      default:
        throw new Error(`Unsupported tool type: ${type as string}`);
    }
  }

  supportedToolTypes(): string[] {
    return Object.values(ToolType);
  }
}
