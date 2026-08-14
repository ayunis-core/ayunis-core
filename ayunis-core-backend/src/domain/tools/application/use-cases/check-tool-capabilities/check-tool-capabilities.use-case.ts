import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { CheckToolCapabilitiesQuery } from './check-tool-capabilities.query';
import { Tool } from 'src/domain/tools/domain/tool.entity';
import { DisplayableTool } from 'src/domain/tools/domain/displayable-tool.entity';

export interface ToolCapabilities {
  isDisplayable: boolean;
  isExecutable: boolean;
}

@Injectable()
export class CheckToolCapabilitiesUseCase {
  constructor(
    @InjectPinoLogger(CheckToolCapabilitiesUseCase.name)
    private readonly logger: PinoLogger,
  ) {}

  execute(query: CheckToolCapabilitiesQuery): ToolCapabilities {
    this.logger.info({ name: query.tool.name }, 'execute');

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
