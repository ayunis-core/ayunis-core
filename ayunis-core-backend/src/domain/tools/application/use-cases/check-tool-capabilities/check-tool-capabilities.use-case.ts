import { Injectable, Logger } from '@nestjs/common';
import { CheckToolCapabilitiesQuery } from './check-tool-capabilities.query';
import { Tool } from '../../../domain/tool.entity';
import { DisplayableTool } from '../../../domain/displayable-tool.entity';

export interface ToolCapabilities {
  isDisplayable: boolean;
  isExecutable: boolean;
}

@Injectable()
export class CheckToolCapabilitiesUseCase {
  private readonly logger = new Logger(CheckToolCapabilitiesUseCase.name);

  execute(query: CheckToolCapabilitiesQuery): ToolCapabilities {
    this.logger.log('execute', query.tool.name);

    return {
      isDisplayable: this.isDisplayable(query.tool),
      isExecutable: this.isExecutable(query.tool),
    };
  }

  isDisplayable(tool: Tool): boolean {
    return tool instanceof DisplayableTool;
  }

  isExecutable(tool: Tool): boolean {
    if (!this.isDisplayable(tool)) {
      return true;
    }
    // Displayable tools can opt into backend execution
    return (tool as DisplayableTool).isExecutable === true;
  }
}
