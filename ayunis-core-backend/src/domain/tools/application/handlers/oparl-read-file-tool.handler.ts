import type { UUID } from 'crypto';
import { Injectable, Logger } from '@nestjs/common';
import { ReadOparlFileQuery } from 'src/domain/oparl/application/use-cases/read-oparl-file/read-oparl-file.query';
import { ReadOparlFileUseCase } from 'src/domain/oparl/application/use-cases/read-oparl-file/read-oparl-file.use-case';
import { OparlFileTextStatus } from 'src/domain/oparl/domain/oparl-file-text';
import {
  ToolExecutionContext,
  ToolExecutionHandler,
} from 'src/domain/tools/application/ports/execution.handler';
import { ToolExecutionFailedError } from 'src/domain/tools/application/tools.errors';
import {
  oparlFileToolResult,
  validateOparlToolInput,
} from 'src/domain/tools/application/utils/oparl-tool-results.utils';
import { OparlReadFileTool } from 'src/domain/tools/domain/tools/oparl-read-file-tool.entity';

@Injectable()
export class OparlReadFileToolHandler extends ToolExecutionHandler {
  private readonly logger = new Logger(OparlReadFileToolHandler.name);

  constructor(private readonly readOparlFile: ReadOparlFileUseCase) {
    super();
  }

  async execute(params: {
    tool: OparlReadFileTool;
    input: Record<string, unknown>;
    context: ToolExecutionContext;
  }): Promise<string> {
    const { tool, input, context } = params;
    const { fileId, fromPage = 1 } = validateOparlToolInput(tool, input);
    this.logger.log(
      { threadId: context.threadId, fileId, fromPage },
      'execute',
    );
    context.signal?.throwIfAborted();
    const reading = await this.readOparlFile.execute(
      new ReadOparlFileQuery(fileId as UUID, fromPage),
    );
    // Outside the linked bodies looks exactly like missing.
    if (!reading) {
      return `No document with ID ${fileId} was found in the linked council information systems.`;
    }
    if (
      reading.status === OparlFileTextStatus.EXTRACTED &&
      reading.pages.length === 0 &&
      fromPage > 1
    ) {
      throw new ToolExecutionFailedError({
        toolName: tool.name,
        exposeToLLM: true,
        message: `fromPage ${fromPage} is past the end of this document, which has ${reading.pageCount ?? 0} pages.`,
      });
    }
    return oparlFileToolResult(reading);
  }
}
