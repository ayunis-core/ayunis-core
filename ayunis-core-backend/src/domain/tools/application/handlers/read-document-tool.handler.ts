import { Inject, Injectable, Logger } from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import {
  ToolExecutionContext,
  ToolExecutionHandler,
} from 'src/domain/tools/application/ports/execution.handler';
import { ReadDocumentTool } from 'src/domain/tools/domain/tools/read-document-tool.entity';
import { ToolExecutionFailedError } from 'src/domain/tools/application/tools.errors';
import { FindArtifactWithVersionsUseCase } from 'src/domain/artifacts/application/use-cases/find-artifact-with-versions/find-artifact-with-versions.use-case';
import { FindArtifactWithVersionsQuery } from 'src/domain/artifacts/application/use-cases/find-artifact-with-versions/find-artifact-with-versions.query';
import { UUID } from 'crypto';
import toolsConfig from 'src/config/tools.config';
import { readTextArtifactPage } from 'src/domain/tools/application/utils/artifact-read.utils';

@Injectable()
export class ReadDocumentToolHandler extends ToolExecutionHandler {
  private readonly logger = new Logger(ReadDocumentToolHandler.name);

  constructor(
    private readonly findArtifactWithVersionsUseCase: FindArtifactWithVersionsUseCase,
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
    const { tool, input } = params;
    this.logger.log('Executing read_document tool');

    try {
      return await this.readDocument(tool, input);
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
  ): Promise<string> {
    const {
      artifact_id: artifactId,
      startLine = 1,
      numLines = this.config.sourceGetText.maxLines,
    } = tool.validateParams(input);

    const artifact = await this.findArtifactWithVersionsUseCase.execute(
      new FindArtifactWithVersionsQuery({ artifactId: artifactId as UUID }),
    );

    return readTextArtifactPage({
      toolName: tool.name,
      artifact,
      startLine,
      numLines,
      ...this.config.sourceGetText,
    });
  }
}
