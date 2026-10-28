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
import {
  paginateText,
  type TextPaginationResult,
} from 'src/domain/tools/application/utils/text-extraction.utils';

interface ReadDocumentResult {
  artifactId: string;
  title: string;
  version: number;
  totalLines: number;
  requestedStartLine: number;
  requestedNumLines: number;
  actualStartLine: number;
  actualEndLine: number;
  truncated: boolean;
  truncationReasons: TextPaginationResult['truncationReasons'];
  content: string;
  nextPage: {
    artifact_id: string;
    startLine: number;
    numLines: number;
  } | null;
  paginationHint: string | null;
}

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

    const currentVersion = artifact.versions.find(
      (version) => version.versionNumber === artifact.currentVersionNumber,
    );

    if (!currentVersion) {
      throw new Error(
        `Current version ${artifact.currentVersionNumber} not found for artifact ${artifact.id}`,
      );
    }

    const page = paginateText({
      toolName: tool.name,
      text: currentVersion.content,
      startLine,
      numLines,
      ...this.config.sourceGetText,
    });
    const result: ReadDocumentResult = {
      artifactId: artifact.id,
      title: artifact.title,
      version: artifact.currentVersionNumber,
      totalLines: page.totalLines,
      requestedStartLine: startLine,
      requestedNumLines: numLines,
      actualStartLine: page.actualStartLine,
      actualEndLine: page.actualEndLine,
      truncated: page.truncated,
      truncationReasons: page.truncationReasons,
      content: page.extractedText,
      nextPage: page.nextStartLine
        ? { artifact_id: artifactId, startLine: page.nextStartLine, numLines }
        : null,
      paginationHint: page.nextStartLine
        ? `Call read_document again with startLine ${page.nextStartLine} to continue.`
        : null,
    };
    return JSON.stringify(result);
  }
}
