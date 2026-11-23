import { Inject, Injectable, Logger } from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import {
  ToolExecutionContext,
  ToolExecutionHandler,
} from 'src/domain/tools/application/ports/execution.handler';
import { ReadDocumentTool } from 'src/domain/tools/domain/tools/read-document-tool.entity';
import { ToolExecutionFailedError } from 'src/domain/tools/application/tools.errors';
import { ReadArtifactInRunUseCase } from 'src/domain/artifacts/application/use-cases/read-artifact-in-run/read-artifact-in-run.use-case';
import { ReadArtifactInRunQuery } from 'src/domain/artifacts/application/use-cases/read-artifact-in-run/read-artifact-in-run.query';
import { artifactRunOf } from 'src/domain/tools/application/utils/artifact-run.utils';
import { UUID } from 'crypto';
import toolsConfig from 'src/config/tools.config';
import { readTextArtifactPage } from 'src/domain/tools/application/utils/artifact-read.utils';

@Injectable()
export class ReadDocumentToolHandler extends ToolExecutionHandler {
  private readonly logger = new Logger(ReadDocumentToolHandler.name);

  constructor(
    private readonly readArtifactInRunUseCase: ReadArtifactInRunUseCase,
    @Inject(toolsConfig.KEY)
    private readonly config: ConfigType<typeof toolsConfig>,
  ) {
    super();
  }

  async execute(params: {
    tool: ReadDocumentTool;
    input: Record<string, unknown>;
    context: ToolExecutionContext;
  }): Promise<string> {
    const { tool, input, context } = params;
    this.logger.log('Executing read_document tool');

    try {
      return await this.readDocument(tool, input, context);
    } catch (error) {
      if (error instanceof ToolExecutionFailedError) {
        throw error;
      }
      this.logger.error({ err: error }, 'Failed to execute read_document tool');
      throw new ToolExecutionFailedError({
        toolName: tool.name,
        message: error instanceof Error ? error.message : 'Unknown error',
        exposeToLLM: true,
      });
    }
  }

  private async readDocument(
    tool: ReadDocumentTool,
    input: Record<string, unknown>,
    context: ToolExecutionContext,
  ): Promise<string> {
    const {
      artifact_id: artifactId,
      startLine = 1,
      numLines = this.config.sourceGetText.maxLines,
    } = tool.validateParams(input);

    const read = await this.readArtifactInRunUseCase.execute(
      new ReadArtifactInRunQuery({
        artifactId: artifactId as UUID,
        run: artifactRunOf(context),
      }),
    );
    if (read.threadPiiMasks) {
      context.onPiiMasks?.(read.threadPiiMasks);
    }

    return readTextArtifactPage({
      toolName: tool.name,
      read,
      startLine,
      numLines,
      ...this.config.sourceGetText,
    });
  }
}
