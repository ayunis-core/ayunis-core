import { Inject, Injectable, Logger } from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import {
  ToolExecutionContext,
  ToolExecutionHandler,
} from 'src/domain/tools/application/ports/execution.handler';
import { ReadSpreadsheetTool } from 'src/domain/tools/domain/tools/read-spreadsheet-tool.entity';
import { ToolExecutionFailedError } from 'src/domain/tools/application/tools.errors';
import { FindArtifactWithVersionsUseCase } from 'src/domain/artifacts/application/use-cases/find-artifact-with-versions/find-artifact-with-versions.use-case';
import { FindArtifactWithVersionsQuery } from 'src/domain/artifacts/application/use-cases/find-artifact-with-versions/find-artifact-with-versions.query';
import { ArtifactType } from 'src/domain/artifacts/domain/value-objects/artifact-type.enum';
import { UUID } from 'crypto';
import toolsConfig from 'src/config/tools.config';
import {
  assertArtifactType,
  readSpreadsheetArtifactPage,
} from 'src/domain/tools/application/utils/artifact-read.utils';

@Injectable()
export class ReadSpreadsheetToolHandler extends ToolExecutionHandler {
  private readonly logger = new Logger(ReadSpreadsheetToolHandler.name);

  constructor(
    private readonly findArtifactWithVersionsUseCase: FindArtifactWithVersionsUseCase,
    @Inject(toolsConfig.KEY)
    private readonly config: ConfigType<typeof toolsConfig>,
  ) {
    super();
  }

  async execute(params: {
    tool: ReadSpreadsheetTool;
    input: Record<string, unknown>;
    context: ToolExecutionContext;
  }): Promise<string> {
    const { tool, input, context } = params;
    this.logger.log('Executing read_spreadsheet tool');

    try {
      return await this.readSpreadsheet(tool, input, context.threadId);
    } catch (error) {
      if (error instanceof ToolExecutionFailedError) {
        throw error;
      }
      this.logger.error(
        { err: error },
        'Failed to execute read_spreadsheet tool',
      );
      throw new ToolExecutionFailedError({
        toolName: tool.name,
        message: error instanceof Error ? error.message : 'Unknown error',
        exposeToLLM: true,
      });
    }
  }

  private async readSpreadsheet(
    tool: ReadSpreadsheetTool,
    input: Record<string, unknown>,
    threadId: UUID,
  ): Promise<string> {
    const {
      artifact_id: artifactId,
      startRow = 1,
      numRows = this.config.sourceGetText.maxLines,
    } = tool.validateParams(input);

    const artifact = await this.findArtifactWithVersionsUseCase.execute(
      new FindArtifactWithVersionsQuery({
        artifactId: artifactId as UUID,
        linkedThreadId: threadId,
      }),
    );
    assertArtifactType(artifact, ArtifactType.SPREADSHEET, tool.name);

    return readSpreadsheetArtifactPage({
      toolName: tool.name,
      artifact,
      startRow,
      numRows,
      maxRows: this.config.sourceGetText.maxLines,
      maxChars: this.config.sourceGetText.maxChars,
    });
  }
}
