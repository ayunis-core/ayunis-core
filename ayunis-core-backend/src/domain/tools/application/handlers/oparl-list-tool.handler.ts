import { Injectable, Logger } from '@nestjs/common';
import { OparlListType } from 'src/domain/oparl/application/models/oparl-read';
import { ListOparlObjectsQuery } from 'src/domain/oparl/application/use-cases/list-oparl-objects/list-oparl-objects.query';
import { ListOparlObjectsUseCase } from 'src/domain/oparl/application/use-cases/list-oparl-objects/list-oparl-objects.use-case';
import {
  ToolExecutionContext,
  ToolExecutionHandler,
} from 'src/domain/tools/application/ports/execution.handler';
import {
  oparlListToolResult,
  validateOparlToolInput,
} from 'src/domain/tools/application/utils/oparl-tool-results.utils';
import {
  OparlListTool,
  type OparlListToolType,
} from 'src/domain/tools/domain/tools/oparl-list-tool.entity';

const LIST_TYPES: Record<OparlListToolType, OparlListType> = {
  meetings: OparlListType.MEETINGS,
  organizations: OparlListType.ORGANIZATIONS,
  persons: OparlListType.PERSONS,
};

@Injectable()
export class OparlListToolHandler extends ToolExecutionHandler {
  private readonly logger = new Logger(OparlListToolHandler.name);

  constructor(private readonly listOparlObjects: ListOparlObjectsUseCase) {
    super();
  }

  async execute(params: {
    tool: OparlListTool;
    input: Record<string, unknown>;
    context: ToolExecutionContext;
  }): Promise<string> {
    const { tool, input, context } = params;
    const { type, bodyIds, filters, page } = validateOparlToolInput(
      tool,
      input,
    );
    this.logger.log({ threadId: context.threadId, type, page }, 'execute');
    context.signal?.throwIfAborted();
    const result = await this.listOparlObjects.execute(
      new ListOparlObjectsQuery(LIST_TYPES[type], bodyIds, filters, page),
    );
    return oparlListToolResult(result);
  }
}
