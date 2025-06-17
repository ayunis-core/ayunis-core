import { Injectable, Logger } from '@nestjs/common';
import { CheckToolCapabilitiesQuery } from './check-tool-capabilities.query';
import { Tool } from '../../../domain/tool.entity';

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

  isDisplayable(_: Tool): boolean {
    // TODO: Implement
    return false;
  }

  isExecutable(_: Tool): boolean {
    // TODO: Implement
    return true;
  }
}
