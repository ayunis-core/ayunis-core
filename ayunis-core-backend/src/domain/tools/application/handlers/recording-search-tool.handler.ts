import { Injectable, Logger } from '@nestjs/common';
import type { RecordingSearchResult } from 'src/domain/recordings/application/models/recording-search';
import { SearchRecordingsQuery } from 'src/domain/recordings/application/use-cases/search-recordings/search-recordings.query';
import { SearchRecordingsUseCase } from 'src/domain/recordings/application/use-cases/search-recordings/search-recordings.use-case';
import {
  ToolExecutionContext,
  ToolExecutionHandler,
} from 'src/domain/tools/application/ports/execution.handler';
import { ToolExecutionFailedError } from 'src/domain/tools/application/tools.errors';
import { handleEmbeddingError } from 'src/domain/tools/application/utils/embedding-error.utils';
import {
  type RecordingSearchParameters,
  RecordingSearchTool,
} from 'src/domain/tools/domain/tools/recording-search-tool.entity';
import { formatTimestamp } from 'src/domain/transcriptions/domain/transcript-turns';

@Injectable()
export class RecordingSearchToolHandler extends ToolExecutionHandler {
  private readonly logger = new Logger(RecordingSearchToolHandler.name);

  constructor(private readonly searchRecordings: SearchRecordingsUseCase) {
    super();
  }

  async execute(params: {
    tool: RecordingSearchTool;
    input: Record<string, unknown>;
    context: ToolExecutionContext;
  }): Promise<string> {
    const { tool, input, context } = params;
    this.logger.log(
      { threadId: context.threadId, workspaceId: tool.scope.workspaceId },
      'execute',
    );
    const { queries, uploadedFrom, uploadedTo } = this.validateInput(
      tool,
      input,
    );
    try {
      const results = await this.searchRecordings.execute(
        new SearchRecordingsQuery(queries, tool.scope.workspaceId, {
          from: uploadedFrom,
          to: uploadedTo,
        }),
      );
      return JSON.stringify(results.map(toToolResult));
    } catch (error) {
      return handleEmbeddingError(error, tool.name);
    }
  }

  // A schema violation must reach the model so it can correct the call;
  // ExecuteToolUseCase hides raw errors from it.
  private validateInput(
    tool: RecordingSearchTool,
    input: Record<string, unknown>,
  ): RecordingSearchParameters {
    try {
      return tool.validateParams(input);
    } catch (error) {
      throw new ToolExecutionFailedError({
        toolName: tool.name,
        message: error instanceof Error ? error.message : 'Invalid parameters',
        exposeToLLM: true,
      });
    }
  }
}

function toToolResult(result: RecordingSearchResult) {
  const { position } = result;
  return {
    chunkId: result.chunkId,
    citable: true,
    content: result.content,
    recordingId: result.recording.id,
    recordingName: result.recording.name,
    uploadedAt: result.recording.uploadedAt.toISOString(),
    position: position.kind,
    ...(position.kind === 'transcript' && {
      start: formatTimestamp(position.start),
      end: formatTimestamp(position.end),
      speakers: position.speakerNumbers.map((number) => `Speaker ${number}`),
    }),
    matchedQueries: result.matchedQueries,
  };
}
