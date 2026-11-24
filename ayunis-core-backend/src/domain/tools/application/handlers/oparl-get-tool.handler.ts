import type { UUID } from 'crypto';
import { Injectable, Logger } from '@nestjs/common';
import { GetOparlObjectQuery } from 'src/domain/oparl/application/use-cases/get-oparl-object/get-oparl-object.query';
import { GetOparlObjectUseCase } from 'src/domain/oparl/application/use-cases/get-oparl-object/get-oparl-object.use-case';
import {
  ToolExecutionContext,
  ToolExecutionHandler,
} from 'src/domain/tools/application/ports/execution.handler';
import {
  oparlObjectToolResult,
  validateOparlToolInput,
} from 'src/domain/tools/application/utils/oparl-tool-results.utils';
import { OparlGetTool } from 'src/domain/tools/domain/tools/oparl-get-tool.entity';

@Injectable()
export class OparlGetToolHandler extends ToolExecutionHandler {
  private readonly logger = new Logger(OparlGetToolHandler.name);

  constructor(private readonly getOparlObject: GetOparlObjectUseCase) {
    super();
  }

  async execute(params: {
    tool: OparlGetTool;
    input: Record<string, unknown>;
    context: ToolExecutionContext;
  }): Promise<string> {
    const { tool, input, context } = params;
    const { id } = validateOparlToolInput(tool, input);
    this.logger.log({ threadId: context.threadId, id }, 'execute');
    context.signal?.throwIfAborted();
    const object = await this.getOparlObject.execute(
      new GetOparlObjectQuery(id as UUID),
    );
    // Outside the linked bodies looks exactly like missing.
    if (!object) {
      return `No paper, meeting, organization or person with ID ${id} was found in the linked council information systems.`;
    }
    return oparlObjectToolResult(object);
  }
}
