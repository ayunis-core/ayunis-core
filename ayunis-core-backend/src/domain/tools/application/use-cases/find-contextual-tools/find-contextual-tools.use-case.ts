import { Injectable, Logger } from '@nestjs/common';
import { Tool } from '../../../domain/tool.entity';
import { ToolFactory } from '../../tool.factory';
import { FindContextualToolsQuery } from './find-contextual-tools.query';
import { contextualToolTypes } from '../../../domain/value-objects/tool-type.enum';
import { ContextualTool } from '../../../domain/contextual-tool.entity';

@Injectable()
export class FindContextualToolsUseCase {
  private readonly logger = new Logger(FindContextualToolsUseCase.name);

  constructor(private readonly toolFactory: ToolFactory) {}

  execute(query: FindContextualToolsQuery): Tool[] {
    this.logger.log('execute', query);

    return contextualToolTypes
      .map((type) => this.toolFactory.createTool(type))
      .filter(
        (tool) =>
          tool instanceof ContextualTool && tool.isAvailable(query.thread),
      );
  }
}
