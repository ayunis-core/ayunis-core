import { Injectable, Logger } from '@nestjs/common';
import { SearchOparlQuery } from 'src/domain/oparl/application/use-cases/search-oparl/search-oparl.query';
import { SearchOparlUseCase } from 'src/domain/oparl/application/use-cases/search-oparl/search-oparl.use-case';
import {
  ToolExecutionContext,
  ToolExecutionHandler,
} from 'src/domain/tools/application/ports/execution.handler';
import {
  oparlSearchToolResult,
  validateOparlToolInput,
} from 'src/domain/tools/application/utils/oparl-tool-results.utils';
import { OparlSearchTool } from 'src/domain/tools/domain/tools/oparl-search-tool.entity';

@Injectable()
export class OparlSearchToolHandler extends ToolExecutionHandler {
  private readonly logger = new Logger(OparlSearchToolHandler.name);

  constructor(private readonly searchOparl: SearchOparlUseCase) {
    super();
  }

  async execute(params: {
    tool: OparlSearchTool;
    input: Record<string, unknown>;
    context: ToolExecutionContext;
  }): Promise<string> {
    const { tool, input, context } = params;
    const { queries, bodyIds, filters, page } = validateOparlToolInput(
      tool,
      input,
    );
    this.logger.log(
      { threadId: context.threadId, queryCount: queries.length, bodyIds, page },
      'execute',
    );
    context.signal?.throwIfAborted();
    const outcome = await this.searchOparl.execute(
      new SearchOparlQuery(queries, bodyIds, filters, page),
    );
    return oparlSearchToolResult(outcome);
  }
}
